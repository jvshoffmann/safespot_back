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

app.post('/api/register', async (req, res) => {
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
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.post('/api/login', async (req, res) => {
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
});

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
          // Se não encontrarmos um estabelecimento, retorne um erro ou uma resposta vazia
          return res.status(404).json({ success: false, message: 'Estabelecimento não encontrado.' });
      }

      const establishmentId = establishmentResult.rows[0].id;

      // Agora, com o establishment_id, busque as avaliações
      const reviewsResult = await client.query('SELECT * FROM reviews WHERE establishment_id = $1', [establishmentId]);
      
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
