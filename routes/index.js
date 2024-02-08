var express = require('express');
var router = express.Router();
const userModel = require("./users");
const postModel = require("./post");
const passport = require('passport');
const localStrategy = require("passport-local");
const upload = require("./multer");
const post = require('./post');

passport.use(new localStrategy(userModel.authenticate()));

router.get('/', function(req, res) {
  res.render('index', {footer: false});
});

router.get('/login', function(req, res) {
  res.render('login', {footer: false});
});

router.get('/feed',isLoggedIn, async function(req, res) {
  const posts = await postModel.find().populate("user");
  res.render('feed', {footer: true, posts});
});

router.get('/profile',isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({username: req.session.passport.user });
  res.render('profile', {footer: true, user});
});

router.get('/search',isLoggedIn, function(req, res) {
  res.render('search', {footer: true});
});

router.get('/edit',isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({username: req.session.passport.user });
  res.render('edit', {footer: true, user});
});

router.get('/upload',isLoggedIn, function(req, res) {
  res.render('upload', {footer: true});
});

router.post('/register', function(req, res, next){
  const userData = new userModel({
    username: req.body.username,
    name: req.body.name,
    email: req.body.email,
  });

  userModel.register(userData, req.body.password)
  .then(function(){
    passport.authenticate("local")(req, res, function(){
      res.redirect("/profile");
    });
  })
});

router.post('/login',passport.authenticate("local", {
  successRedirect: "/profile",
  failureRedirect: "/login"
}), function(req, res) {
});

router.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

// router.post("/update", upload.single('image'), async function(req, res){
//   const user = await userModel.findOneAndUpdate(
//      {username: req.session.passport.user },
//      {username: req.body.username, name: req.body.name, bio: req.body.bio},
//      {new: true}
//     );

//   user.profileImage = req.file.filename;
//   await user.save();
//   res.redirect("/profile");

// })
router.post("/update", upload.single('image'), async function(req, res){
  try {
    // Check if the user is authenticated
    if (!req.isAuthenticated()) {
      // Redirect or handle the case where the user is not authenticated
      res.redirect("/login");
      return;
    }

    // Now you can safely access the user information
    const user = await userModel.findOneAndUpdate(
      { username: req.session.passport.user },
      { username: req.body.username, name: req.body.name, bio: req.body.bio },
      { new: true }
    );

    // Update the profile image
    if (req.file) {
      user.profileImage = req.file.filename;
      await user.save();
    }

    res.redirect("/profile");
  } catch (error) {
    // Handle errors appropriately
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/upload",isLoggedIn, upload.single("image"), async function(req, res){
  const user = await userModel.findOne({username: req.session.passport.user });
  const post = await postModel.create({
    picture: req.file.filename,
    user: user._id,
    caption: req.body.caption
  })

  user.post.push(post._id);
  await user.save();
  res.redirect("/feed");
});


function isLoggedIn(req, res, next){
  if(req.isAuthenticated()) return next();
  res.redirect("/login") 
}

module.exports = router;
