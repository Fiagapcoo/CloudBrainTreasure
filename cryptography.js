const crypto = require('crypto');

const secretKey = '9e6b7f335e228571f32c28d7d1b69f1c4c4f3a7ad07ec37e6c3fd5e06473cc57';

function generateRandomNumber() {
    return Math.floor(Math.random() * 100000000);
}

function encryptMessage(message) {
    // Create a cipher using the secret key
    const cipher = crypto.createCipher('aes-256-cbc', secretKey);
    
    // Encrypt the message using the cipher and return the result as a base64-encoded string
    let encrypted = cipher.update(message, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  function decryptMessage(encryptedMessage) {
    const decipher = crypto.createDecipher('aes-256-cbc', secretKey);
    

    let decrypted = decipher.update(encryptedMessage, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }


module.exports = { generateRandomNumber, encryptMessage, decryptMessage};
