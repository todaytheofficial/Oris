const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username:{type:String,required:true,unique:true,trim:true,lowercase:true,minlength:3,maxlength:24,match:/^[a-z0-9_]+$/},
  name:{type:String,required:true,trim:true,maxlength:50},
  email:{type:String,sparse:true,trim:true,lowercase:true,default:null},
  avatar:{type:String,default:''},
  bio:{type:String,default:'',maxlength:200},
  followers:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
  following:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
  verified:{type:Boolean,default:false}, 
  verifiedBadge:{type:Boolean,default:false},
  role:{type:String,enum:['user','admin','creator'],default:'user'},
  banned:{type:Boolean,default:false},
  banReason:{type:String,default:''},
  bannedAt:{type:Date,default:null},
  bannedBy:{type:String,default:''},
  verificationCode:{type:String,default:null},
  verificationCodeExpires:{type:Date,default:null},
  registrationStep:{type:Number,default:1},
  theme:{type:String,enum:['light','dark'],default:'light'}
},{timestamps:true});

userSchema.index({email:1},{unique:true,sparse:true,partialFilterExpression:{email:{$ne:null}}});
userSchema.index({username:'text',name:'text'});

module.exports = mongoose.model('User',userSchema);