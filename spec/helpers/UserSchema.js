var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var UserSchema = new Schema({
	userId: { 
		type: String, 
		index: true,
		unique: true,
        required: true, 
    },
    emailId: {
    	type: String, 
		index: true,
		unique: true,
        required: true, 
    },
	arr: Array, 
	created: {
		type: Number, 
		default: new Date().getTime()
	}
});
module.exports = UserSchema;
