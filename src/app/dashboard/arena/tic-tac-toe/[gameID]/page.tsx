
'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { doc, onSnapshot, updateDoc, runTransaction, getDoc, addDoc, collection, serverTimestamp, setDoc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Swords, X, Circle, ArrowLeft, Check, Coins, ShieldCheck, UserCheck, CheckCircle, UserX, Repeat, Repeat1, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';


type TicTacToeGame = {
    id: string;
    player1Id: string;
    player2Id: string;
    player1DisplayName: string;
    player2DisplayName: string;
    player1PhotoURL: string;
    player2PhotoURL: string;
    betAmount: number;
    player1Bet?: number;
    player2Bet?: number;
    player1Agreed: boolean;
    player2Agreed: boolean;
    player1Ready: boolean;
    player2Ready: boolean;
    negotiationRound: number;
    board: (string | null)[];
    nextPlayer: string;
    status: 'pending' | 'betting' | 'negotiating' | 'readying' | 'playing' | 'finished' | 'declined' | 'cancelled';
    winner: string | null;
    rematchId?: string;
    rematchRequestedBy?: string;
    createdAt: any;
    playerX?: string;
    playerO?: string;
    selectedPieceIndex: number | null;
    player1Message?: string;
    player2Message?: string;
};

type PlayerProfile = {
    credits: number;
} | null;


const winningCombos = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]             // diagonals
];

const tauntMessages = [
    "Ano na?",
    "HAHAHAHA",
    "Galing mo naman!",
    "Iniisip...",
    "Sayang!",
    "GG!",
    "Takot?",
    "Ambobo!!!",
    "Wala na!",
    "Chamba"
];

function CountdownModal({ onComplete }: { onComplete: () => void }) {
    const [count, setCount] = useState(3);

    useEffect(() => {
        if (count > 0) {
            const timer = setTimeout(() => setCount(count - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            const timer = setTimeout(onComplete, 500);
            return () => clearTimeout(timer);
        }
    }, [count, onComplete]);

    return (
        <AlertDialog open={true}>
            <AlertDialogContent className="flex flex-col items-center justify-center bg-transparent border-none shadow-none">
                 <AlertDialogHeader>
                    <AlertDialogTitle className="sr-only">Magsisimula na ang Laro!</AlertDialogTitle>
                </AlertDialogHeader>
                <div className="text-9xl font-extrabold text-white animate-ping drop-shadow-2xl">
                    {count > 0 ? count : 'GO!'}
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}

const PieceIndicator = ({ piece, total, used }: { piece: 'X' | 'O', total: number, used: number }) => {
    return (
        <div className="flex gap-2 justify-center">
            {Array.from({ length: total }).map((_, i) => (
                <div key={i} className={cn(
                    "h-6 w-6 rounded-md flex items-center justify-center",
                    i < used ? 'bg-muted' : 'bg-card border'
                )}>
                    {piece === 'X' && <X className={cn("h-4 w-4", i < used ? 'text-muted-foreground' : 'text-blue-500')} />}
                    {piece === 'O' && <Circle className={cn("h-4 w-4", i < used ? 'text-muted-foreground' : 'text-pink-500')} />}
                </div>
            ))}
        </div>
    );
};

export default function TicTacToePage() {
    const params = useParams();
    const gameId = params.gameId as string;
    const { firestore } = useFirestore();
    const currentUser = useUser();
    const { toast } = useToast();
    const router = useRouter();

    const [game, setGame] = useState<TicTacToeGame | null>(null);
    const [loading, setLoading] = useState(true);
    const [bet, setBet] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const [showCountdown, setShowCountdown] = useState(false);
    const [showOpponentLeftModal, setShowOpponentLeftModal] = useState(false);
    const [showSystemBetModal, setShowSystemBetModal] = useState<{show: boolean, amount: number}>({show: false, amount: 0});
    const [isRequestingRematch, setIsRequestingRematch] = useState(false);
    const [showMovementPhaseModal, setShowMovementPhaseModal] = useState(false);
    const prevGameRef = useRef<TicTacToeGame | null>(null);
    
    const [player1Profile, setPlayer1Profile] = useState<PlayerProfile>(null);
    const [player2Profile, setPlayer2Profile] = useState<PlayerProfile>(null);
    
    // States for message bubbles
    const [player1Message, setPlayer1Message] = useState<string | null>(null);
    const [player2Message, setPlayer2Message] = useState<string | null>(null);
    const [tauntCooldown, setTauntCooldown] = useState(false);

    
    const amIPlayer1 = currentUser?.uid === game?.player1Id;
    const amIPlayer2 = currentUser?.uid === game?.player2Id;
    const myRole = amIPlayer1 ? 'player1' : 'player2';
    const minPlayerCredits = Math.min(player1Profile?.credits || Infinity, player2Profile?.credits || Infinity);
    const amIX = currentUser?.uid === game?.playerX;
    const myPiece = amIX ? 'X' : 'O';

     useEffect(() => {
        if (!firestore || !game) return;

        const unsub1 = onSnapshot(doc(firestore, 'users', game.player1Id), (doc) => {
            setPlayer1Profile(doc.data() as PlayerProfile);
        }, (error) => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${game.player1Id}`, operation: 'get' }));
        });
        const unsub2 = onSnapshot(doc(firestore, 'users', game.player2Id), (doc) => {
            setPlayer2Profile(doc.data() as PlayerProfile);
        }, (error) => {
             errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `users/${game.player2Id}`, operation: 'get' }));
        });

        return () => {
            unsub1();
            unsub2();
        }

    }, [firestore, game]);


    const handleUnload = useCallback(async () => {
        if (!firestore || !gameId) return;
        
        const gameDocRef = doc(firestore, 'tic_tac_toe_games', gameId);
        const snap = await getDoc(gameDocRef);
        const gameData = snap.data();
        // Only cancel if game is in progress
        if (gameData && ['betting', 'negotiating', 'readying', 'playing'].includes(gameData.status)) {
            await updateDoc(gameDocRef, { status: 'cancelled' });
        }
    }, [firestore, gameId]);

    const handleBackToArena = useCallback(async () => {
        await handleUnload(); // Set status to 'cancelled'
        router.push('/dashboard/arena'); // Then navigate
    }, [handleUnload, router]);

    useEffect(() => {
        if (!firestore || !gameId || !currentUser) return;

        const gameDocRef = doc(firestore, 'tic_tac_toe_games', gameId);
        
        window.addEventListener('beforeunload', handleUnload);

        const unsubscribe = onSnapshot(gameDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const gameData = { id: docSnap.id, ...docSnap.data() } as TicTacToeGame;
                
                // Handle message bubbles
                if (gameData.player1Message && gameData.player1Message !== player1Message) {
                    setPlayer1Message(gameData.player1Message);
                    setTimeout(() => setPlayer1Message(null), 3000);
                }
                if (gameData.player2Message && gameData.player2Message !== player2Message) {
                    setPlayer2Message(gameData.player2Message);
                    setTimeout(() => setPlayer2Message(null), 3000);
                }

                const previousStatus = game?.status;
                if (previousStatus && ['betting', 'negotiating', 'readying', 'playing'].includes(previousStatus) && gameData.status === 'cancelled') {
                    if (gameData.player1Id === currentUser.uid || gameData.player2Id === currentUser.uid) {
                        setShowOpponentLeftModal(true);
                    }
                    return;
                }
                
                setGame(gameData);
                
                if (gameData.status === 'declined' && gameData.player1Id === currentUser.uid) {
                     toast({ title: "Challenge Kinansela", description: "Kinansela ng kabilang manlalaro ang hamon.", variant: 'destructive' });
                     router.push('/dashboard/inbox');
                }
                 if (gameData.status === 'playing' && game?.status !== 'playing') {
                    setShowCountdown(true);
                }
                
                if(gameData.rematchId) {
                    router.push(`/dashboard/arena/tic-tac-toe/${gameData.rematchId}`);
                }
            } else {
                 if (!showOpponentLeftModal) {
                    toast({ title: "Hindi Nahanap ang Laro", description: "Ang session ng larong ito ay wala na.", variant: 'destructive' });
                    router.push('/dashboard/arena');
                }
            }
            setLoading(false);
        }, (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: gameDocRef.path, operation: 'get' }));
            setLoading(false);
        });


        return () => {
            unsubscribe();
            window.removeEventListener('beforeunload', () => handleUnload);
        };
    }, [firestore, gameId, router, toast, currentUser, game?.status, showOpponentLeftModal, handleUnload, player1Message, player2Message]);

    // Effect to trigger movement phase modal for both players
    useEffect(() => {
        if (game && prevGameRef.current) {
            const totalPieces = game.board.filter(p => p).length;
            const prevTotalPieces = prevGameRef.current.board.filter(p => p).length;

            if (totalPieces === 6 && prevTotalPieces === 5) {
                setShowMovementPhaseModal(true);
            }
        }
        prevGameRef.current = game;
    }, [game]);


    const handleBetSubmit = async () => {
        if (!game || !currentUser || !firestore || !bet) return;
        const betValue = parseInt(bet);
        if (isNaN(betValue) || betValue <= 0) {
            toast({ variant: 'destructive', title: 'Invalid na Pusta', description: 'Pakilagay ng numerong mas mataas sa zero.' });
            return;
        }

        if (betValue > minPlayerCredits) {
             toast({ variant: 'destructive', title: 'Masyadong Mataas ang Pusta', description: `Ang iyong pusta ay hindi pwedeng lumagpas sa pinakamababang balanse ng manlalaro na ${minPlayerCredits} credits.` });
             return;
        }

        setIsUpdating(true);
        const gameDocRef = doc(firestore, 'tic_tac_toe_games', gameId);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const currentGameDoc = await transaction.get(gameDocRef);
                 if (!currentGameDoc.exists()) {
                    throw new Error("Hindi nahanap ang laro");
                }
                const currentGameData = currentGameDoc.data() as TicTacToeGame;

                const updates: any = {};
                updates[`${myRole}Bet`] = betValue;
                updates[`${myRole}Agreed`] = false;

                const otherPlayerRole = amIPlayer1 ? 'player2' : 'player1';
                
                if (currentGameData[`${otherPlayerRole}Bet`] && currentGameData[`${otherPlayerRole}Bet`] === betValue) {
                    updates.status = 'readying';
                    updates.betAmount = betValue;
                } else if(currentGameData[`${otherPlayerRole}Bet`]) {
                    updates.status = 'negotiating';
                    updates.negotiationRound = 1;
                }
                
                transaction.update(gameDocRef, updates);
            });
            
        } catch (error: any) {
             if (error instanceof FirestorePermissionError) {
                errorEmitter.emit('permission-error', error);
            } else {
                console.error("Error submitting bet:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Hindi mailagay ang iyong pusta.' });
            }
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleNegotiationSelect = async (selectedBet: number) => {
        if (!game || !currentUser || !firestore) return;

        setIsUpdating(true);
        const gameDocRef = doc(firestore, 'tic_tac_toe_games', gameId);
        
        try {
            await runTransaction(firestore, async (transaction) => {
                const currentGameDoc = await transaction.get(gameDocRef);
                if (!currentGameDoc.exists()) throw "Hindi nahanap ang laro";
                
                const currentGameData = currentGameDoc.data() as TicTacToeGame;
                
                const updates: any = {
                    [`${myRole}Agreed`]: true,
                    [`${myRole}Bet`]: selectedBet,
                    negotiationRound: currentGameData.negotiationRound + 1
                };
    
                const otherPlayerRole = amIPlayer1 ? 'player2' : 'player1';

                if (currentGameData[`${otherPlayerRole}Agreed`] && currentGameData[`${otherPlayerRole}Bet`] === selectedBet) {
                    updates.status = 'readying';
                    updates.betAmount = selectedBet;
                } else if (currentGameData.negotiationRound >= 2) {
                    const minBet = Math.min(selectedBet, currentGameData[`${otherPlayerRole}Bet`] || 0);
                    const maxBet = Math.min(Math.max(selectedBet, currentGameData[`${otherPlayerRole}Bet`] || 0), minPlayerCredits);
                    const systemBet = Math.floor(Math.random() * (maxBet - minBet + 1)) + minBet;
                    updates.status = 'readying';
                    updates.betAmount = systemBet;
                    setShowSystemBetModal({ show: true, amount: systemBet });
                }
                
                transaction.update(gameDocRef, updates);
            });

        } catch (error: any) {
            if (error instanceof FirestorePermissionError) {
                errorEmitter.emit('permission-error', error);
            } else {
                console.error("Error agreeing to negotiated bet:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Hindi sumang-ayon sa pusta.' });
            }
        } finally {
            setIsUpdating(false);
        }
    }

     const handleReadyClick = async () => {
        if (!game || !currentUser || !firestore || game.status !== 'readying') return;

        setIsUpdating(true);
        const gameDocRef = doc(firestore, 'tic_tac_toe_games', gameId);
        try {
            await runTransaction(firestore, async (transaction) => {
                const gameDoc = await transaction.get(gameDocRef);
                if (!gameDoc.exists()) throw new Error("Hindi nahanap ang laro.");

                const gameData = gameDoc.data() as TicTacToeGame;
                const otherPlayerRole = amIPlayer1 ? 'player2' : 'player1';

                const updates: { [key: string]: any } = {};
                updates[`${myRole}Ready`] = true;

                if (gameData[`${otherPlayerRole}Ready`]) {
                    updates.status = 'playing';
                }
                transaction.update(gameDocRef, updates);
            });
        } catch (error: any) {
            if (error instanceof FirestorePermissionError) {
                errorEmitter.emit('permission-error', error);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Hindi mai-set ang ready status.' });
            }
        } finally {
            setIsUpdating(false);
        }
    };
    
const handleCellClick = async (index: number) => {
    if (!game || !currentUser || isUpdating || game.status !== 'playing' || !firestore) {
        return;
    }

    const gameDocRef = doc(firestore, 'tic_tac_toe_games', gameId);

    try {
        setIsUpdating(true);
        await runTransaction(firestore, async (transaction) => {
            const gameDoc = await transaction.get(gameDocRef);
            if (!gameDoc.exists()) throw new Error("Hindi nahanap ang laro");
            const currentGame = gameDoc.data() as TicTacToeGame;

            if (currentGame.nextPlayer !== currentUser.uid) {
                throw new Error("Hindi mo pa tira.");
            }

            const myPiece = currentGame.playerX === currentUser.uid ? 'X' : 'O';
            const totalPiecesOnBoard = currentGame.board.filter(p => p !== null).length;
            const isPlacementPhase = totalPiecesOnBoard < 6;

            if (isPlacementPhase) {
                const myPiecesCount = currentGame.board.filter(p => p === myPiece).length;
                if (myPiecesCount >= 3) {
                    throw new Error(`Maaari ka lamang maglagay ng 3 piyesa.`);
                }

                if (currentGame.board[index] !== null) {
                    throw new Error("Mayroon nang nakalagay diyan.");
                }

                const newBoard = [...currentGame.board];
                newBoard[index] = myPiece;
                
                const updates: Partial<TicTacToeGame> = {
                    board: newBoard,
                    nextPlayer: currentGame.player1Id === currentUser.uid ? currentGame.player2Id : currentGame.player1Id,
                };
                
                const newTotalPieces = newBoard.filter(p => p !== null).length;
                
                if (newTotalPieces >= 5) { // Check for win starting from 5 pieces
                    for (const combo of winningCombos) {
                        const [a, b, c] = combo;
                        if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
                            const winnerId = newBoard[a] === 'X' ? currentGame.playerX! : currentGame.playerO!;
                            updates.status = 'finished';
                            updates.winner = winnerId;
                            
                            if (currentGame.betAmount > 0) {
                                const loserId = winnerId === currentGame.player1Id ? currentGame.player2Id : currentGame.player1Id;
                                const winnerRef = doc(firestore, 'users', winnerId);
                                const loserRef = doc(firestore, 'users', loserId);
                                const winnerDoc = await transaction.get(winnerRef);
                                const loserDoc = await transaction.get(loserRef);
                                if (!winnerDoc.exists() || !loserDoc.exists()) throw new Error("User not found for prize distribution.");
                                const loserCredits = loserDoc.data().credits;
                                if (loserCredits < currentGame.betAmount) throw new Error("Loser has insufficient credits for the bet.");
                                transaction.update(winnerRef, { credits: winnerDoc.data().credits + currentGame.betAmount });
                                transaction.update(loserRef, { credits: loserCredits - currentGame.betAmount });
                            }
                            break; 
                        }
                    }
                }
                
                transaction.update(gameDocRef, updates as { [key: string]: any });

            } else { // Movement Phase
                if (currentGame.board[index] === myPiece) {
                    // Select a piece to move
                    transaction.update(gameDocRef, { selectedPieceIndex: index });
                } else if (currentGame.selectedPieceIndex !== null && currentGame.board[index] === null) {
                    // Move the selected piece to an empty spot
                    const newBoard = [...currentGame.board];
                    newBoard[currentGame.selectedPieceIndex] = null;
                    newBoard[index] = myPiece;

                    let newWinner: string | null = null;
                    for (const combo of winningCombos) {
                        const [a, b, c] = combo;
                        if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
                            newWinner = newBoard[a] === 'X' ? currentGame.playerX! : currentGame.playerO!;
                            break;
                        }
                    }
                    
                    const updates: Partial<TicTacToeGame> = {
                         board: newBoard,
                         nextPlayer: currentGame.player1Id === currentUser.uid ? currentGame.player2Id : currentGame.player1Id,
                         selectedPieceIndex: null
                    };

                    if (newWinner) {
                        updates.status = 'finished';
                        updates.winner = newWinner;

                        if (currentGame.betAmount > 0) {
                            const loserId = newWinner === currentGame.player1Id ? currentGame.player2Id : currentGame.player1Id;
                            const winnerRef = doc(firestore, 'users', newWinner!);
                            const loserRef = doc(firestore, 'users', loserId);
                            
                            const winnerDoc = await transaction.get(winnerRef);
                            const loserDoc = await transaction.get(loserRef);
                            if (!winnerDoc.exists() || !loserDoc.exists()) throw new Error("User not found for prize distribution.");
                            
                            const loserCredits = loserDoc.data().credits;
                            if (loserCredits < currentGame.betAmount) throw new Error("Loser has insufficient credits for the bet.");
                            transaction.update(winnerRef, { credits: winnerDoc.data().credits + currentGame.betAmount });
                            transaction.update(loserRef, { credits: loserCredits - currentGame.betAmount });
                        }
                    }
                    
                    transaction.update(gameDocRef, updates as { [key: string]: any });
                } else if (currentGame.selectedPieceIndex !== null && index === currentGame.selectedPieceIndex) {
                    // Deselect the piece
                    transaction.update(gameDocRef, { selectedPieceIndex: null });
                } else {
                    throw new Error(currentGame.selectedPieceIndex === null ? 'Pumili ng sarili mong piyesa para ilipat.' : 'Dapat ilipat sa bakanteng pwesto.');
                }
            }
        });
    } catch (error: any) {
        if (error instanceof FirestorePermissionError) {
            errorEmitter.emit('permission-error', error);
        } else {
            toast({ variant: 'destructive', title: 'Hindi Pwedeng Ilipat', description: error.message || "Could not make the move." });
        }
    } finally {
        setIsUpdating(false);
    }
};

    
    const handleRematch = async () => {
        if (!game || !firestore || !currentUser) return;
    
        setIsRequestingRematch(true);
        const gameDocRef = doc(firestore, 'tic_tac_toe_games', gameId);
    
        try {
            await runTransaction(firestore, async (transaction) => {
                const gameDoc = await transaction.get(gameDocRef);
                if (!gameDoc.exists()) throw new Error("Hindi nahanap ang laro");
    
                const gameData = gameDoc.data() as TicTacToeGame;
    
                if (gameData.rematchId) {
                    return; 
                }
    
                if (gameData.rematchRequestedBy && gameData.rematchRequestedBy !== currentUser.uid) {
                    const newGameRef = doc(collection(firestore, 'tic_tac_toe_games'));
                    
                    const newPlayerX = game.playerO;
                    const newPlayerO = game.playerX;
                    
                    transaction.set(newGameRef, {
                        player1Id: game.player1Id,
                        player2Id: game.player2Id,
                        player1DisplayName: game.player1DisplayName,
                        player2DisplayName: game.player2DisplayName,
                        player1PhotoURL: game.player1PhotoURL,
                        player2PhotoURL: game.player2PhotoURL,
                        playerX: newPlayerX,
                        playerO: newPlayerO,
                        board: Array(9).fill(null),
                        status: 'betting',
                        nextPlayer: newPlayerX,
                        winner: null,
                        createdAt: serverTimestamp(),
                        betAmount: 0,
                        player1Bet: null,
                        player2Bet: null,
                        player1Agreed: false,
                        player2Agreed: false,
                        player1Ready: false,
                        player2Ready: false,
                        negotiationRound: 1,
                        rematchId: null,
                        rematchRequestedBy: null,
                        selectedPieceIndex: null,
                    });
                    
                    transaction.update(gameDocRef, { rematchId: newGameRef.id });
    
                } else if (!gameData.rematchRequestedBy) {
                    transaction.update(gameDocRef, { rematchRequestedBy: currentUser.uid });
                }
            });
        } catch (error) {
            console.error("Rematch error:", error);
            toast({ variant: 'destructive', title: 'Hindi makapagsimula ng rematch.' });
        } finally {
            setIsRequestingRematch(false);
        }
    };
    
    const handleSendTaunt = async (message: string) => {
        if (!game || !currentUser || !firestore || tauntCooldown) return;

        const gameDocRef = doc(firestore, 'tic_tac_toe_games', gameId);
        const messageField = `${myRole}Message`;

        try {
            await updateDoc(gameDocRef, { [messageField]: message });
            setTauntCooldown(true);
            setTimeout(() => {
                // Clear the message in Firestore after animation
                updateDoc(gameDocRef, { [messageField]: null });
            }, 3000);
            setTimeout(() => {
                setTauntCooldown(false);
            }, 3000); // 3 second cooldown
        } catch (error) {
            console.error("Error sending taunt:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not send message.' });
        }
    };

    if (loading || !currentUser) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!game) {
        return <div>Hindi nahanap ang laro.</div>;
    }
    
    const opponent = {
        id: amIPlayer1 ? game.player2Id : game.player1Id,
        displayName: amIPlayer1 ? game.player2DisplayName : game.player1DisplayName,
        photoURL: amIPlayer1 ? game.player2PhotoURL : game.player1PhotoURL,
    };
    
    const getGameStatusMessage = () => {
        const isMyTurn = game.nextPlayer === currentUser.uid;
        const totalPiecesOnBoard = game.board.filter(p => p !== null).length;
        const isPlacementPhase = totalPiecesOnBoard < 6;
        const myPiecesOnBoard = game.board.filter(p => p === myPiece).length;

        if (game.status === 'playing') {
            if (isPlacementPhase) {
                if (isMyTurn) {
                    if (myPiecesOnBoard < 3) return `Tira mo. Ilagay ang iyong piyesa (${myPiece}).`;
                    return "Tapos na ang placement mo. Hintayin ang kalaban.";
                } else {
                     return `Naghihintay kay ${opponent.displayName} na maglagay ng piyesa.`;
                }
            } else {
                 return isMyTurn
                    ? (game.selectedPieceIndex !== null ? 'Pumili ng bakanteng pwesto para ilipat.' : 'Piliin ang isa sa iyong mga piyesa para ilipat.')
                    : `Naghihintay kay ${opponent.displayName}...`;
            }
        }
        
        switch(game.status) {
            case 'betting':
                 return amIPlayer1 || game.player1Bet ? 'Maglagay ng iyong unang pusta.' : `Naghihintay kay ${opponent.displayName} na tumaya.`;
            case 'negotiating':
                return 'Hindi tugma ang mga pusta. Mag-negotiate ng huling pusta.';
            case 'readying':
                return 'Nagkasundo sa pusta! I-click ang Ready para simulan ang laban.';
            case 'finished':
                if (game.winner) {
                    return game.winner === currentUser.uid ? `Nanalo ka ng ${game.betAmount} credits!` : `Nanalo si ${opponent.displayName} ng ${game.betAmount} credits.`;
                }
                return "Tabla ang laro!";
            default:
                return "Naghahanda ng arena...";
        }
    }
    
    const renderBettingPhase = () => {
        const myBet = game[`${myRole}Bet`];
        const otherPlayerBet = game[amIPlayer1 ? 'player2Bet' : 'player1Bet'];
        const waitingForOpponent = myBet && !otherPlayerBet;

        if (!amIPlayer1 && !game.player1Bet && game.status === 'betting') {
            return (
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Naghihintay ng Kalaban</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center p-4 bg-muted rounded-md">
                         <Loader2 className="animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Naghihintay kay ${game.player1DisplayName} na sumali sa arena...</p>
                    </CardContent>
                </Card>
            )
        }
        
        return (
         <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Ilagay ang Iyong Pusta</CardTitle>
                <CardDescription>
                    Ilagay ang halaga ng credits na gusto mong ipusta.
                    <span className="block text-xs text-muted-foreground mt-1">
                        Max na pusta na pwede: {minPlayerCredits} credits.
                    </span>
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {waitingForOpponent ? (
                    <div className="text-center p-4 bg-muted rounded-md">
                        <p>Pumusta ka ng <span className="font-bold text-primary">{myBet}</span> credits.</p>
                        <p className="text-sm text-muted-foreground">Naghihintay sa kabilang manlalaro...</p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="betAmount">Halaga ng Pusta</Label>
                            <Input id="betAmount" type="number" placeholder="Maglagay ng credits..." value={bet} onChange={(e) => setBet(e.target.value)} disabled={isUpdating || !!myBet}/>
                        </div>
                        <Button onClick={handleBetSubmit} className="w-full" disabled={isUpdating || !bet || !!myBet}>
                            {isUpdating ? <Loader2 className="animate-spin" /> : myBet ? `Pumusta ka ng ${myBet}` : `Ipasa ang Pusta`}
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
        )
    };

    const renderNegotiationModal = () => {
        if (game.status !== 'negotiating') return null;

        const p1Bet = game.player1Bet || 0;
        const p2Bet = game.player2Bet || 0;
        const midPoint = Math.round((p1Bet + p2Bet) / 2);
        const midBet = Math.min(midPoint, minPlayerCredits);

        const options = Array.from(new Set([p1Bet, p2Bet, midBet])).sort((a,b) => a-b);
        
        const myAgreement = game[`${myRole}Agreed`] ? game[`${myRole}Bet`] : null;
        
        return (
            <AlertDialog open={true}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Pag-usapan ang Pusta (Round {game.negotiationRound})</AlertDialogTitle>
                        <AlertDialogDescription>
                            Hindi nagtugma ang inyong mga pusta. Mangyaring magkasundo sa huling halaga. Kung hindi kayo magkasundo pagkatapos ng 2 round, isang pusta ang pipiliin para sa inyo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-around items-center py-4">
                        {options.map(option => (
                            <Button
                                key={option}
                                variant={myAgreement === option ? "default" : "outline"}
                                onClick={() => handleNegotiationSelect(option)}
                                disabled={isUpdating}
                            >
                                <Coins className="mr-2 h-4 w-4"/> {option}
                            </Button>
                        ))}
                    </div>
                    <div className="text-sm text-muted-foreground pt-4 space-y-2">
                        <div className="flex justify-between">
                            <span>{game.player1DisplayName}:</span>
                            <span className={cn("font-semibold", game.player1Agreed ? "text-green-500" : "text-gray-500")}>
                                {game.player1Agreed ? `Bumoto para sa ${game.player1Bet}` : 'Naghihintay...'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>{game.player2DisplayName}:</span>
                            <span className={cn("font-semibold", game.player2Agreed ? "text-green-500" : "text-gray-500")}>
                                 {game.player2Agreed ? `Bumoto para sa ${game.player2Bet}` : 'Naghihintay...'}
                            </span>
                        </div>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        )
    };

    const renderReadyingPhase = () => (
         <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle>Humanda!</CardTitle>
                <CardDescription>Ang pusta ay nakatakda sa <span className="font-bold text-primary">{game.betAmount}</span> credits. Handa ka na ba?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p className="font-semibold">{game.player1DisplayName}</p>
                        {game.player1Ready ? <div className="text-green-500 font-bold flex items-center justify-center gap-2"><CheckCircle/> Handa na</div> : <div className="text-muted-foreground">Hindi pa Handa</div>}
                    </div>
                     <div>
                        <p className="font-semibold">{game.player2DisplayName}</p>
                        {game.player2Ready ? <div className="text-green-500 font-bold flex items-center justify-center gap-2"><CheckCircle/> Handa na</div> : <div className="text-muted-foreground">Hindi pa Handa</div>}
                    </div>
                </div>
                 <Button onClick={handleReadyClick} className="w-full" disabled={isUpdating || game[`${myRole}Ready`]}>
                     {isUpdating ? <Loader2 className="animate-spin" /> : (game[`${myRole}Ready`] ? <><Check className="mr-2"/> Handa ka na</> : 'Handa na ako!')}
                 </Button>
            </CardContent>
        </Card>
    );

    const renderGameBoard = () => {
        const isMyTurn = game.nextPlayer === currentUser?.uid;
        const totalPiecesOnBoard = game.board.filter(p => p !== null).length;
        const isPlacementPhase = totalPiecesOnBoard < 6;
        const myPiecesOnBoard = game.board.filter(p => p === myPiece).length;

        return (
            <div className="grid grid-cols-3 gap-2 md:gap-4">
                {game.board.map((cell, index) => {
                    const isMyPiece = cell === myPiece;
                    const isSelected = index === game.selectedPieceIndex;
                    
                    let canBeClicked = false;
                    if (isMyTurn && !isUpdating && game.status === 'playing') {
                        if (isPlacementPhase) {
                            if (cell === null && myPiecesOnBoard < 3) {
                                canBeClicked = true;
                            }
                        } else { // Movement phase
                            if (game.selectedPieceIndex === null) {
                                canBeClicked = isMyPiece; // Can only select own piece
                            } else {
                                // Can move to an empty spot or deselect by clicking another of my pieces
                                canBeClicked = cell === null || isMyPiece;
                            }
                        }
                    }
                    let pieceToHighlight = isMyTurn && !isPlacementPhase && isMyPiece;

                    return (
                    <button
                        key={index}
                        onClick={() => handleCellClick(index)}
                        className={cn(
                            "flex items-center justify-center h-24 w-24 md:h-32 md:w-32 rounded-lg bg-muted shadow-inner transition-all duration-200",
                            canBeClicked && "cursor-pointer hover:bg-primary/10",
                            isSelected && "ring-2 ring-accent ring-offset-2 ring-offset-background animate-pulse",
                            pieceToHighlight && !isSelected && "bg-green-500/20"
                        )}
                        disabled={!canBeClicked}
                    >
                        {cell === 'X' && <X className="h-16 w-16 text-blue-500" />}
                        {cell === 'O' && <Circle className="h-14 w-14 text-pink-500" />}
                    </button>
                )})}
            </div>
        );
    }
    
    const renderResultModal = () => {
        const iAmRematchRequester = game.rematchRequestedBy === currentUser.uid;
        const opponentRequestedRematch = game.rematchRequestedBy && game.rematchRequestedBy !== currentUser.uid;

        return (
            <AlertDialog open={game.status === 'finished'}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center text-2xl">
                             {game.winner ? (game.winner === currentUser?.uid ? 'Panalo Ka!' : 'Talo Ka!') : "Tabla!"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-center">
                             {game.winner ? (game.winner === currentUser?.uid ? `Congrats! Nanalo ka ng ${game.betAmount} credits.` : `Sayang. Natalo ka ng ${game.betAmount} credits.`) : "Walang credits na nagbago."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2">
                        <Button onClick={handleRematch} disabled={isRequestingRematch || iAmRematchRequester}>
                            {isRequestingRematch ? <Loader2 className="animate-spin" /> : iAmRematchRequester ? 'Naghihintay sa kalaban...' : (opponentRequestedRematch ? 'Tanggapin ang Rematch' : 'Laro Ulit')}
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/dashboard/arena">Balik sa Arena</Link>
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )
    };
    
    const renderOpponentLeftModal = () => (
        <AlertDialog open={showOpponentLeftModal}>
            <AlertDialogContent>
                <AlertDialogHeader>
                     <AlertDialogTitle className="text-center text-2xl flex flex-col items-center gap-4">
                        <UserX className="h-12 w-12 text-destructive"/>
                        Umalis ang Kalaban
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                         Umalis si ${opponent.displayName} sa laban. Kinansela na ang laro.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction asChild>
                        <Link href="/dashboard/arena">Balik sa Arena</Link>
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    const renderSystemBetModal = () => (
         <AlertDialog open={showSystemBetModal.show} onOpenChange={(open) => !open && setShowSystemBetModal({show: false, amount: 0})}>
            <AlertDialogContent>
                <AlertDialogHeader>
                     <AlertDialogTitle>Hindi Nagtugma ang mga Pusta</AlertDialogTitle>
                     <AlertDialogDescription>Itinakda ng sistema ang pusta sa <span className="font-bold text-primary">{showSystemBetModal.amount}</span> credits. Humanda!</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setShowSystemBetModal({show: false, amount: 0})}>OK</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    const renderMovementPhaseModal = () => (
        <AlertDialog open={showMovementPhaseModal} onOpenChange={(open) => !open && setShowMovementPhaseModal(false)}>
            <AlertDialogContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Movement Phase!</AlertDialogTitle>
                    <AlertDialogDescription>
                        Lahat ng piyesa ay nailagay na. Ngayon, pumili ng iyong piyesa na ililipat sa isang bakanteng espasyo para manalo.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setShowMovementPhaseModal(false)}>OK</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
    
    const getPlayerCard = (player: 'player1' | 'player2') => {
        if (!game) return null;
        const playerId = game[`${player}Id`];
        const playerProfile = player === 'player1' ? player1Profile : player2Profile;
        const playerPiece = game.playerX === playerId ? 'X' : 'O';
        const piecesOnBoard = game.board.filter(p => p === playerPiece).length;
        const isMyTurn = game.nextPlayer === playerId && game.status === 'playing';
        const message = player === 'player1' ? player1Message : player2Message;

        return (
             <div className={cn(
                "relative flex flex-col items-center gap-2 p-4 rounded-lg transition-all w-40",
                isMyTurn && "bg-primary/10 shadow-lg border-primary border-2"
            )}>
                 {message && (
                    <div className="absolute -top-8 w-max max-w-xs bg-card border rounded-full px-3 py-1.5 text-sm shadow-lg animate-in fade-in-0 zoom-in-95">
                        {message}
                    </div>
                 )}
                <Avatar className="h-16 w-16 border-4 border-primary">
                    <AvatarImage src={game[`${player}PhotoURL`]} />
                    <AvatarFallback>{game[`${player}DisplayName`].charAt(0)}</AvatarFallback>
                </Avatar>
                <p className="font-bold text-primary text-center truncate w-full">{game[`${player}DisplayName`]}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Coins className="h-3 w-3" /> {playerProfile?.credits ?? '...'}</p>
                 <PieceIndicator piece={playerPiece} total={3} used={piecesOnBoard} />
                 {currentUser?.uid === playerId && game.status === 'playing' && (
                     <Popover>
                        <PopoverTrigger asChild>
                            <Button size="sm" variant="outline" className="mt-2 h-8" disabled={tauntCooldown}>
                                <MessageCircle className="mr-2 h-4 w-4" />
                                {tauntCooldown ? '...' : 'Taunt'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-1">
                            <div className="grid grid-cols-2 gap-1">
                                {tauntMessages.map((msg) => (
                                    <Button key={msg} variant="ghost" size="sm" onClick={() => handleSendTaunt(msg)}>
                                        {msg}
                                    </Button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                 )}
            </div>
        )
    }

  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-screen space-y-6">
        {showCountdown && <CountdownModal onComplete={() => setShowCountdown(false)} />}
        {showOpponentLeftModal && renderOpponentLeftModal()}
        {showSystemBetModal.show && renderSystemBetModal()}
        {showMovementPhaseModal && renderMovementPhaseModal()}

        <div className="absolute top-4 left-4">
             <Button variant="outline" size="sm" onClick={handleBackToArena}>
                <ArrowLeft className="mr-2"/> Balik sa Arena
             </Button>
        </div>
        <Card className="w-full max-w-lg">
            <CardContent className="p-4 flex justify-around items-start">
                {getPlayerCard('player1')}
                <div className="text-center pt-8">
                    <Swords className="h-8 w-8 text-muted-foreground" />
                    {game.betAmount > 0 && 
                        <p className="font-bold text-lg text-accent flex items-center gap-1 mt-2">
                            <Coins className="h-4 w-4" />
                            {game.betAmount}
                        </p>
                    }
                </div>
                {getPlayerCard('player2')}
            </CardContent>
        </Card>
        
        <div className="text-center p-4 rounded-lg bg-card border w-full max-w-lg">
            <p className="font-semibold text-lg">{getGameStatusMessage()}</p>
        </div>

        {game.status === 'betting' && renderBettingPhase()}
        {game.status === 'negotiating' && renderNegotiationModal()}
        {game.status === 'readying' && renderReadyingPhase()}
        {(game.status === 'playing' || game.status === 'finished') && renderGameBoard()}
        {game.status === 'finished' && renderResultModal()}
    </div>
  );
}
