## lx-mongoose-transaction

A for ok mongoose-transaction which supports Promises and further runs of the same transaction.
A node module for transaction-like db writes

mongoose-transaction handles insert, update and remove.

If any operation that you provide to mongoose-transaction fails, 
all the documents that involved in the process will return back to its old state.

Example:

```javascript
var mongoose = require('mongoose');
var Transaction = require('mongoose-transaction')(mongoose);
  
var transaction = new Transaction();
transaction.insert('User', {userId:'someuser1' , emailId:'test email1'});
transaction.update('User', id, {userId:'someuser2' , emailId:'test email2'});
transaction.remove('User', id2);
transaction.run()
.then(function(docs){
  // your code here
});
```

To run the tests:
```javascript
npm test
```
