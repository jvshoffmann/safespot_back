const cors = require('cors');
const express = require("express");
const bodyParser = require('body-parser');
const client = require('./config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


function verifyToken(req, res, next) {
  
  const token = req.headers['authorization'];
  
  if (!token) return res.status(403).send({ message: 'No token provided.' });

  jwt.verify(token, 'secreto', (err, decoded) => {
    if (err) return res.status(500).send({ message: 'Failed to authenticate token.' });

    req.userId = decoded.id;
    next();
  });
}

const app = express();
app.use(bodyParser.json());
app.use(cors());

/*app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await client.query('INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id', [username, email, hashedPassword]);
    //res.json({ success: true, userId: result.rows[0].id });
    const token = jwt.sign({ id: result.rows[0].id }, 'secreto', { expiresIn: '1h' });
    res.json({ success: true, token });
  } catch (error) {
    
    res.status(500).json({ success: false, message: 'Erro ao registrar.' });
  }
});*/
const nodemailer = require('nodemailer');

function sendVerificationEmail(userEmail, token) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'plataformasafespot@gmail.com',
      pass: 'nojz mbca qzjg mxhg'
    }
  });

  const mailOptions = {
    from: 'plataformasafespot@gmail.com', 
    to: userEmail, 
    subject: 'Verifique seu e-mail para o SafeSpot',

    //html: `<p>Por favor, clique no link para verificar seu e-mail: <a href="http://localhost:3001/verify-email/${token}">Verificar E-mail</a></p>`
    html: `<p>Por favor, clique no link para verificar seu e-mail: <a href="https://appsafespot-fa1a6d341394.herokuapp.com/verify-email/${token}">Verificar E-mail</a></p>`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Erro ao enviar e-mail:', error);
    } else {
      console.log('E-mail enviado: ' + info.response);
    }
  });
}


/*app.get('/api/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, 'seuSegredo');
    await client.query('UPDATE users SET is_verified = true WHERE email = $1', [decoded.email]);
    
    res.redirect('http://localhost:3001/login?verified=true');
    //res.redirect('https://https://appsafespot-fa1a6d341394.herokuapp.com/login?verified=true'); // Redireciona para a página de login
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao verificar e-mail.' });
  }
});*/

app.get('/api/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, 'seuSegredo');
    await client.query('UPDATE users SET is_verified = true WHERE email = $1', [decoded.email]);
    
    // Retorna uma resposta JSON indicando sucesso
    res.json({ success: true, message: 'Seu e-mail foi verificado com sucesso!' });
  } catch (error) {
    // Retorna uma resposta JSON indicando falha
    res.status(500).json({ success: false, message: 'Erro ao verificar e-mail.' });
  }
});

app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  // Token de verificação para o e-mail
  const verificationToken = jwt.sign({ email }, 'seuSegredo', { expiresIn: '24h' });
  console.log(verificationToken);
  try {
    const userResult = await client.query(
      'INSERT INTO users (username, email, password, verification_token) VALUES ($1, $2, $3, $4) RETURNING id', 
      [username, email, hashedPassword, verificationToken]
    );

    // O usuário é registrado, agora envia o e-mail de verificação
    sendVerificationEmail(email, verificationToken);

    // Cria o token JWT para autenticação
    const userId = userResult.rows[0].id;
    const authToken = jwt.sign({ id: userId }, 'secreto', { expiresIn: '1h' });

    // Retorna o token JWT para autenticação imediata (opcional)
    res.json({ success: true, token: authToken, userId, message: 'Registro concluído. Verifique seu e-mail.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao registrar.' });
  }
});


/*app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await client.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id', 
      [username, email, hashedPassword]
    );
    const userId = result.rows[0].id;
    const token = jwt.sign({ id: userId }, 'secreto', { expiresIn: '1h' });
    
    res.json({ success: true, token, userId }); // Adicionando userId na resposta
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erro ao registrar.' });
  }
});*/


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

/*app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Consulta o usuário com base no e-mail fornecido
    const result = await client.query('SELECT id, password FROM users WHERE email = $1', [email]);

    const user = result.rows[0];

    if (!user) {
      // Se nenhum usuário for encontrado
      return res.status(400).json({ success: false, message: 'E-mail ou senha estão incorretos.' });
    }

    // Compara a senha fornecida com a senha armazenada no banco de dados
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Se a senha não for válida
      return res.status(400).json({ success: false, message: 'E-mail ou senha estão incorretos.' });
    }

    
    const token = jwt.sign({ id: user.id }, 'secreto', { expiresIn: '1h' });

    res.json({ success: true, token });

  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ success: false, message: 'Erro ao fazer login. Tente novamente mais tarde.' });
  }
});*/

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Consulta o usuário com base no e-mail fornecido
    const result = await client.query('SELECT id, password, is_verified FROM users WHERE email = $1', [email]);

    const user = result.rows[0];

    if (!user) {
      // Se nenhum usuário for encontrado
      return res.status(400).json({ success: false, message: 'E-mail ou senha estão incorretos.' });
    }

    // Verifica se o usuário está verificado
    if (!user.is_verified) {
      return res.status(401).json({ success: false, message: 'E-mail não verificado. Por favor, verifique seu e-mail.' });
    }

    // Compara a senha fornecida com a senha armazenada no banco de dados
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      // Se a senha for válida, cria o token
      const token = jwt.sign({ id: user.id }, 'secreto', { expiresIn: '1h' });
      
      // Retorna o token e o userId
      res.json({ success: true, token, userId: user.id });
    } else {
      // Se a senha não for válida
      return res.status(400).json({ success: false, message: 'E-mail ou senha estão incorretos.' });
    }
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ success: false, message: 'Erro ao fazer login. Tente novamente mais tarde.' });
  }
});


/*app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Consulta o usuário com base no e-mail fornecido
    const result = await client.query('SELECT id, password FROM users WHERE email = $1', [email]);

    const user = result.rows[0];

    if (!user) {
      // Se nenhum usuário for encontrado
      return res.status(400).json({ success: false, message: 'E-mail ou senha estão incorretos.' });
    }

    // Compara a senha fornecida com a senha armazenada no banco de dados
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      // Se a senha for válida, cria o token
      const token = jwt.sign({ id: user.id }, 'secreto', { expiresIn: '1h' });
      
      // Retorna o token e o userId
      res.json({ success: true, token, userId: user.id });
    } else {
      // Se a senha não for válida
      return res.status(400).json({ success: false, message: 'E-mail ou senha estão incorretos.' });
    }
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ success: false, message: 'Erro ao fazer login. Tente novamente mais tarde.' });
  }
});*/

app.get('/api/establishment/:maps_id', async (req, res) => {
  try {
    const { maps_id } = req.params;

    const result = await client.query('SELECT * FROM establishments WHERE maps_id = $1', [maps_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Estabelecimento não encontrado.' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Erro ao buscar detalhes do estabelecimento:', error);
    res.status(500).json({ message: 'Erro ao buscar detalhes do estabelecimento.' });
  }
});


// Rota para buscar avaliações de um estabelecimento

app.get('/api/reviews/:maps_id', async (req, res) => {
  try {
      const { maps_id } = req.params;

      // Primeiro, obtenha o establishment_id usando o maps_id
      const establishmentResult = await client.query('SELECT id FROM establishments WHERE maps_id = $1', [maps_id]);

      if (establishmentResult.rows.length === 0) {
         
          return res.status(404).json({ success: false, message: 'Estabelecimento não encontrado.' });
      }

      const establishmentId = establishmentResult.rows[0].id;

      // Agora, com o establishment_id, busca as avaliações
      const reviewsResult = await client.query(`
        SELECT reviews.*, users.username 
        FROM reviews 
        JOIN users ON reviews.user_id = users.id 
        WHERE reviews.establishment_id = $1
      `, [establishmentId]);
      console.log(reviewsResult.rows)
      
      res.json({ success: true, reviews: reviewsResult.rows });
  } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar avaliações.' });
  }
});

/*app.get('/api/reviews/:maps_id', async (req, res) => {
  try {
      const { maps_id } = req.params;
      const result = await client.query(`
          SELECT reviews.* 
          FROM reviews 
          JOIN establishments ON establishments.id = reviews.establishment_id 
          WHERE establishments.maps_id = $1
  `, [maps_id]);
      
      res.json({ success: true, reviews: result.rows });
  } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar avaliações.' });
  }
});*/

// Rota para enviar avaliação

app.post('/api/reviews', verifyToken, async (req, res) => {
  try {
      const { establishment_id, rating, comment } = req.body;
      const userId = req.userId;

      // Insira a avaliação diretamente, uma vez que já temos o establishment_id
      await client.query(
        'INSERT INTO reviews (user_id, establishment_id, rating, comment) VALUES ($1, $2, $3, $4)',
        [userId, establishment_id, rating, comment]
      );

      res.json({ success: true });
  } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      res.status(500).json({ success: false, message: 'Erro ao enviar avaliação.', error: error.message });
  }
});

/*app.post('/api/reviews', verifyToken, async (req, res) => {
  try {
      const { maps_id, rating, comment } = req.body;
      const userId = req.userId;


      // Primeiro, obtenha o establishment_id usando o maps_id
      const establishmentRes = await client.query('SELECT id FROM establishments WHERE maps_id = $1', [maps_id]);
     
      if (establishmentRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Estabelecimento não encontrado.' });
    }
    const establishmentId = establishmentRes.rows[0].id

      // Agora, insira usando o establishment_id
      await client.query('INSERT INTO reviews (user_id, establishment_id, rating, comment) VALUES ($1, $2, $3, $4)', [userId, establishmentId, rating, comment]);

      res.json({ success: true });
  } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
      res.status(500).json({ success: false, message: 'Erro ao enviar avaliação.', error: error.message });
  }
});
*/

app.get('/api/establishment-id/:mapsId', async (req, res) => {
  try {
      const { mapsId } = req.params;
      const result = await client.query('SELECT id FROM establishments WHERE maps_id = $1', [mapsId]);
      
      if(result.rows.length > 0) {
          res.json({ success: true, id: result.rows[0].id });
      } else {
          res.status(404).json({ success: false, message: 'Estabelecimento não encontrado' });
      }
  } catch (error) {
      console.error('Erro ao buscar ID do estabelecimento:', error);
      res.status(500).json({ success: false, message: 'Erro ao buscar ID do estabelecimento.' });
  }
});

app.post('/api/ensure-establishment', async (req, res) => {
  try {
      const { maps_id, name, description, address } = req.body;

      const result = await client.query('SELECT id FROM establishments WHERE maps_id = $1', [maps_id]);
      console.log("Resultado:"+result)
      if (result.rows.length === 0) {
          await client.query('INSERT INTO establishments (maps_id, name, description, address) VALUES ($1, $2, $3, $4)', 
              [maps_id, name, description, address]);
      }

      res.json({ success: true });
  } catch (error) {
      console.error('Erro ao cadastrar/verificar estabelecimento:', error);
      res.status(500).json({ success: false, message: 'Erro ao cadastrar/verificar estabelecimento.' });
  }
});

app.delete('/api/review/:reviewId', verifyToken, async (req, res) => {
  const reviewId = req.params.reviewId;
  const userId = req.userId;

  try {
    const reviewResult = await client.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Avaliação não encontrada.' });
    }

    if (reviewResult.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Você não tem permissão para excluir esta avaliação.' });
    }

    await client.query('DELETE FROM reviews WHERE id = $1', [reviewId]);
    res.json({ success: true, message: 'Avaliação excluída com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir avaliação:', error);
    res.status(500).json({ success: false, message: 'Erro ao excluir avaliação.' });
  }
});

// Atualizar uma avaliação específica
app.put('/api/review/:id', verifyToken, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    const { rating, comment } = req.body;
    const userId = req.userId;

    // Primeiro, verifique se a avaliação pertence ao usuário
    const reviewResult = await client.query('SELECT * FROM reviews WHERE id = $1', [reviewId]);

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Avaliação não encontrada.' });
    }

    const review = reviewResult.rows[0];

    if (review.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Você não tem permissão para editar esta avaliação.' });
    }

    // Agora, atualize a avaliação
    await client.query(
      'UPDATE reviews SET rating = $1, comment = $2 WHERE id = $3',
      [rating, comment, reviewId]
    );

    res.json({ success: true, message: 'Avaliação atualizada com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar avaliação:', error);
    res.status(500).json({ success: false, message: 'Erro ao atualizar avaliação.' });
  }
});
