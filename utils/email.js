
function sendEmailAlert(to, subject, message) {
  // Mock: just log to console
  console.log('--- MOCK EMAIL ALERT ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Message: ${message}`);
  console.log('------------------------');
}

module.exports = sendEmailAlert;
