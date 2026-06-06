export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  public context: SecurityRuleContext;
  constructor(context: SecurityRuleContext) {
    let message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n`;
    message += JSON.stringify(context, null, 2);
    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
    
    // This is to ensure the prototype chain is correctly set up for extending native objects.
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }
}
