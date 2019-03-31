const express = require('express');
const nodemailer = require('nodemailer');
const smtpPool = require('nodemailer-smtp-pool');
const bodyParser = require('body-parser');
const fs = require('fs');
require('dotenv').config();

const app = express();


const Console = console;
let userNumber = 0;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.render('index');
});

const config = {
  mailer: {
    service: 'Gmail',
    host: 'smtp.gmail.com',
    port: process.env.MAILER_PORT,
    user: process.env.MAILER_USER,
    password: process.env.MAILER_PW,
  },
};

const getUserlist = () => {
  const user = JSON.parse(fs.readFileSync('./public/userlist.json', 'utf8'));
  const lastNum = user.table.length;
  const obj = { user, lastNum };
  return obj;
};

const getArticles = () => {
  const crawl = JSON.parse(fs.readFileSync('./public/article.json', 'utf8'));
  return crawl;
};

const mailing = (user, lastNum, crawl, res) => {
  for (let i = 0; i < lastNum + 1; i += 1) {
    for (let j = 0; j < crawl.articles.length; j += 1) {
      const transporter = nodemailer.createTransport(smtpPool({
        service: config.mailer.service,
        host: config.mailer.host,
        port: config.mailer.port,
        auth: {
          user: config.mailer.user,
          pass: config.mailer.password,
        },
      }));

      const mailOptions = {
        from: config.mailer.user,
        to: user.table[i].email,
        subject: crawl.articles[j].title,
        html: `<a href='${crawl.articles[j].url}'>${crawl.articles[j].title}</a>
          <a> 구독을 취소하시려면 </a> 
          <a href='localhost:3000/check/${user.table[i].id}'>여기</a>
          <a>를 클릭해주세요</a>`,
      };
      transporter.sendMail(mailOptions, (err) => {
        if (err) {
          Console.log('failed... => ', err);
        } else {
          Console.log('succeed');
        }
        transporter.close();
      });
    }
    res.redirect('/');
  }
};

app.post('/send', async (req, res) => {
  const ul = await getUserlist();
  const crawl = await getArticles();
  const { user, lastNum } = await ul;
  await mailing(user, lastNum, crawl, res);
  return res.redirect('/');
});

app.post('/getEmail', (req, res) => {
  fs.readFile('./public/userlist.json', 'utf8', (err, data) => {
    if (err) {
      Console.log(err);
    } else {
      const obj = JSON.parse(data);
      obj.table.push({ id: userNumber, email: req.body.email });
      const json = JSON.stringify(obj);
      fs.writeFile('./public/userlist.json', json, 'utf8', () => {
        if (err) Console.log(err);
      });
      userNumber += 1;
    }
  });

  return res.redirect('/');
});

const deleteUser = (index) => {
  fs.readFile('./public/userlist.json', 'utf8', (err, data) => {
    if (err) {
      Console.log(err);
    } else {
      const obj = JSON.parse(data);
      obj.table.splice(index, 1);
      const json = JSON.stringify(obj);
      fs.writeFile('./public/userlist.json', json, 'utf8', () => {
        if (err) Console.log(err);
      });
    }
  });
};

app.get('/check/:id', (req, res) => {
  res.render('check');
});

app.post('/cancle', async (req, res) => {
  const ul = await getUserlist();
  const userId = await Number(req.body.userId);
  const { user } = await ul;
  const cancleUser = await user.table.find(u => u.id === userId);
  const index = await user.table.indexOf(cancleUser);
  if (await cancleUser.email === req.body.useremail) {
    await deleteUser(index);
    return res.redirect('/success');
  }
  return res.redirect('/invalid');
});

app.get('/success', (req, res) => {
  res.render('success');
});

app.get('/invalid', (req, res) => {
  res.render('invalid');
});

app.listen(port, () => {
  Console.log('Server running at port 3000!');
});
