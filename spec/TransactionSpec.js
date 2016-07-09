describe("Transaction", function() {
  var mongoose = require('mongoose');
  mongoose.connect("mongodb://localhost/test");
  mongoose.Promise = require('bluebird');
  var userSchema = require("./helpers/UserSchema");
  mongoose.model('User', userSchema);
  var Transaction = require('../index')(mongoose);


  beforeEach(function(done) {
    mongoose.model('User').remove({}, function(){
      done();
    });
  });

  it("should properly insert User data into Db", function(done) {
    var transaction = new Transaction();
    transaction.insert('User', {userId:'someuser1' , emailId:'test email1'});
    transaction.run()
	.then(function(docs){
        expect(docs[0].emailId).toEqual('test email1');
        return mongoose.model('User').findOne({userId:'someuser1'});
	})
	.then(function(docs){
          expect(docs.emailId).toEqual('test email1');
          done();
    });
  });

  it("should rollback one insert when other insert fails", function(done) {
    var transaction = new Transaction();
    transaction.insert('User', {userId:'someuser1' , emailId:'test email1'});
    transaction.insert('User', {});
    transaction.run()
	.then(function(docs){
		return mongoose.model('User').findOne({userId:'someuser1'});
	})
	.then(function(docs){
          expect(docs).toEqual(null);
          done();
	});
  });

  it("should update when there is no fails", function(done) {
	var updatedDoc;
    mongoose.model('User')({userId:'someuser1' , emailId:'test email1'}).save()
	.then(function(doc){
      expect(doc).not.toBe(null);
      expect(doc.userId).toEqual("someuser1");
      var transaction = new Transaction();
      transaction.update('User', doc._id, {userId:'someuser2' , emailId:'test email2'});
	  updatedDoc = doc;
      return transaction.run();
	})
	.then(function(docs){
        return mongoose.model('User').findOne({_id:updatedDoc._id})
	})
	.then(function(docs){
          expect(docs.userId).toEqual("someuser2");
          done();
    });
  });

  it("should rollback update when one insert fails", function(done) {
    mongoose.model('User')({userId:'someuser1' , emailId:'test email1'}).save()
	.then(function(doc){
      expect(doc).not.toBe(null);
      expect(doc.userId).toEqual("someuser1");
      var transaction = new Transaction();
      transaction.update('User', doc._id, {userId:'someuser2' , emailId:'test email2'});
      transaction.insert('User', {});
      return transaction.run();
	})
    .then(function(docs){
        return mongoose.model('User').findOne({userId:'someuser1'});
	})
	.then(function(docs){
          expect(docs.userId).toEqual("someuser1");
          done();
    });
  });

  it("should rollback remove when one insert fails", function(done) {
    mongoose.model('User')({userId:'someuser1' , emailId:'test email1'}).save()
	.then(function(doc){
      expect(doc).not.toBe(null);
      expect(doc.userId).toEqual("someuser1");
      var transaction = new Transaction();
      transaction.remove('User', doc._id);
      transaction.insert('User', {});
      return transaction.run(1);
	})
	.then(function(docs){
        return mongoose.model('User').findOne({userId:'someuser1'});
	})
	.then(function(docs){
          expect(docs.userId).toEqual("someuser1");
          done();
    });
  });

});
