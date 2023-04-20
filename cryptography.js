//make a function that generate a random number with 8 digits
function generateRandomNumber() {
    return Math.floor(Math.random() * 100000000);
}

module.exports = { generateRandomNumber };