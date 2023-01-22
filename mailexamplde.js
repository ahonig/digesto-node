const nodemailer = require('nodemailer');
  
let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "legislativod@gmail.com",
            pass: "*******"
        }
});
  
let message = {
    from: "alexdaniels15@email.com",
    to: "adhonig@gmail.com",
    subject: "Subject",
    html: "<h1>Hello SMTP Email</h1>"
}
  
transporter.sendMail(message, function(err, info) {
  if (err) {
    console.log(err);
  } else {
    console.log(info);
  }
})

