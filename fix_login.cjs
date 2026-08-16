const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldGoogle = `  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      setShowAuthModal(false);
    } catch (error: any) {
      console.error("Google Login Error:", error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (error.code === 'auth/unauthorized-domain') {
        alert("Login failed because this domain is not authorized.");
      } else {
        alert("Login failed: " + error.message);
      }
    }
  };`;

const newGoogle = `  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      setShowAuthModal(false);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      console.error("Google Login Error:", error);
      if (error.code === 'auth/unauthorized-domain') {
        alert("Login failed because this domain is not authorized.");
      } else {
        alert("Login failed: " + error.message);
      }
    }
  };`;

content = content.replace(oldGoogle, newGoogle);

const oldGithub = `  const handleGithubLogin = async () => {
    try {
      await signInWithPopup(auth, new GithubAuthProvider());
      setShowAuthModal(false);
    } catch (error: any) {
      console.error("Github Login Error:", error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (error.code === 'auth/account-exists-with-different-credential') {
        alert("An account already exists with the same email address but different sign-in credentials.");
      } else if (error.code === 'auth/unauthorized-domain') {
        alert("Login failed because this domain is not authorized.");
      } else {
        alert("Login failed: " + error.message);
      }
    }
  };`;

const newGithub = `  const handleGithubLogin = async () => {
    try {
      await signInWithPopup(auth, new GithubAuthProvider());
      setShowAuthModal(false);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      console.error("Github Login Error:", error);
      if (error.code === 'auth/account-exists-with-different-credential') {
        alert("An account already exists with the same email address but different sign-in credentials.");
      } else if (error.code === 'auth/unauthorized-domain') {
        alert("Login failed because this domain is not authorized.");
      } else {
        alert("Login failed: " + error.message);
      }
    }
  };`;

content = content.replace(oldGithub, newGithub);

fs.writeFileSync('src/App.tsx', content);
