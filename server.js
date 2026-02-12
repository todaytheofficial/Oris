require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const usersRoutes = require('./routes/users');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(cors());
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({extended:true,limit:'50mb'}));
app.use(cookieParser());

app.use('/css',express.static(path.join(__dirname,'public/css')));
app.use('/js',express.static(path.join(__dirname,'public/js')));
app.use('/pages',express.static(path.join(__dirname,'public/pages')));
app.use('/uploads',express.static(path.join(__dirname,'public/uploads')));

app.use('/api/auth',authRoutes);
app.use('/api/posts',postsRoutes);
app.use('/api/users',usersRoutes);
app.use('/api/upload',uploadRoutes);
app.use('/api/admin',adminRoutes);

app.get('/',(req,res)=>res.redirect('/pages/auth.html'));
app.get('/feed',(req,res)=>res.sendFile(path.join(__dirname,'public/pages/feed.html')));
app.get('/profile/:username?',(req,res)=>res.sendFile(path.join(__dirname,'public/pages/profile.html')));
app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'public/pages/admin.html')));

mongoose.connect(process.env.MONGODB_URI)
  .then(()=>{
    console.log('MongoDB connected');
    const PORT=process.env.PORT||3000;
    app.listen(PORT,()=>console.log('Oris running on http://localhost:'+PORT));
  })
  .catch(err=>{console.error('MongoDB error:',err);process.exit(1)});