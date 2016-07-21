var Promise = require('bluebird');

function Transaction (mongoose) {

	var transacts = [];
	var updateOrRemoveObjects = [];
	var successDocData = [];

	this.insert = function(collectionName, data){
		var  Model = mongoose.model(collectionName);
		if(!Model)
			throw new Error('Collection not found');
		transacts.push(constructInsertTask({ Model: Model, data:data, type: 'insert' }));
	};

	this.update = function(collectionName, objectId, data){

		var  Model = mongoose.model(collectionName);
		if(!Model)
			throw new Error('Collection not found');
		updateOrRemoveObjects.push({objectId: objectId, data:data, Model:Model, type:'update'});
		// var doc = Model(data);
		// var transact = { type: 'update', doc: doc };
		// storeOldDoc(objectId, transact);
	};

	this.remove = function(collectionName, objectId){
		var  Model = mongoose.model(collectionName);
		if(!Model)
			throw new Error('Collection not found');
		updateOrRemoveObjects.push({objectId: objectId, Model:Model, type:'remove'});
		// var transact = {type: 'remove'};
		// storeOldDoc(objectId, transact);
	};

	this.run = function(a){
		var updateOrRemoveDeferredArray = [];
		updateOrRemoveObjects.forEach(function(docData){
			updateOrRemoveDeferredArray.push(getTask(docData));
		});
		
		return Promise.all(updateOrRemoveDeferredArray)
		.then(function(tasks){
			if(tasks && tasks.length > 0)
				transacts = transacts.concat(tasks);

	  		var transactsDeffered = [];
	  		transacts.forEach(function(transact){
	  			transactsDeffered.push(transact.call());
	  		});
			
			transacts = [];
			updateOrRemoveObjects = [];

			if (transactsDeffered.length > 0){
				return Promise.all(transactsDeffered);
			} else {
				return Promise.resolve();
			}
		})
		.then(function(results){
			var errs = [], docs = [];

			results.forEach(function(result){
				if (result.isRejected()){
					errs.push(result.reason());
				} else if(result.isFulfilled()){
					successDocData.push(result.value());
					if (result.value().doc) docs.push(result.value().doc);
				}
			});
			if(errs.length > 0){
				var rollbacksDeffered = [];
				if (successDocData.length !== 0){
					successDocData.forEach(function(docData){
						rollbacksDeffered.push(rollback(docData));
					});
					//everything has been rolled back, empty previous success
					succesDocData = [];
					return Promise.all(rollbacksDeffered)
						.then(function(){
							return Promise.reject(errs)
						});
				} else {
					return Promise.reject(errs);
				}
			}
			//in case we want to run more steps of this transaction, empty tasks and keep successes
			transacts = [];
			updateOrRemoveObjects = [];
			return Promise.resolve(docs);
		})
	};

	function getTask (docData) {
		return docData.Model.findById(docData.objectId)
		.then(function(oldDoc){
			var task;
			docData.oldDoc = oldDoc;
			if (docData.type === 'update') {
				task = constructUpdateTask(docData);
			} else if (docData.type === 'remove') {
				task = constructRemoveTask(docData);
			}
			return task;
		});
	}

	function rollback (docData) {
		if (!docData || !docData.doc && !docData.oldDoc) { Promise.resolve(); }
		else {
			if(docData.type === 'insert')
				return docData.doc.remove()
				.return();
			else if (docData.type === 'update') {
				for (var key in docData.oldDoc) {
					docData.doc[key] = docData.oldDoc[key];
				}
				return docData.doc.save()
				.return();
			}
			else if (docData.type === 'remove'){
				var oldDocData = JSON.parse(JSON.stringify(docData.oldDoc));
				var oldDoc = new docData.Model(oldDocData);
				return oldDoc.save()
				.return();
			}
		}
	}

	function constructUpdateTask (docData) {
		return function () {
			var oldDocData = JSON.parse(JSON.stringify(docData.oldDoc));
			docData.doc = docData.oldDoc;
			for (var key in docData.data) {
				docData.doc[key] = docData.data[key];
			}
			return docData.doc.save()
			.then(function(doc){
				docData.oldDoc = oldDocData;
				docData.doc = doc;
				return docData;
			})
			.reflect();
		};
	}

	function constructRemoveTask (docData) {
		return function () {
			return docData.oldDoc.remove()
			.then(function(doc){
				docData.doc = doc;
				return docData;
			})
			.reflect();
		};
	}

	function constructInsertTask (docData) {
		return function () {
			var model = new docData.Model(docData.data);
			return model.save()
			.then(function(doc){
				docData.doc = doc;
				return docData;
			})
			.reflect()
		};
	}
}

module.exports = function(mongoose) {
	return function (){
		return new Transaction(mongoose);
	};
};
