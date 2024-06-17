require('dotenv').config()
const http = require('http');
const socketIo = require('socket.io');
const ss = require('socket.io-stream');

const API_KEY = process.env.API_KEY;

const server = http.createServer();

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const requestGetOptions = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${API_KEY}`
  }
};

async function getKeywordIds(keywords) {
  let keywordIds = []

  await keywords.forEach((keyword) => {
    let url = `https://api.themoviedb.org/3/search/keyword?query=${keyword}&page=1`

    fetch(url, requestGetOptions)
      .then(res => res.json())
      .then(json => {
        if (json.results.length > 0) {
          keywordIds.push(json.results[0].id)
        }
      })
  })

  return keywordIds
}

const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

async function getMovieProviders(movieId) {
  const url = `https://api.themoviedb.org/3/movie/${movieId}/watch/providers`

  let responseData = null

  await fetch(url, requestGetOptions)
    .then(res => res.json())
    .then(json => {
      try {
        responseData = json.results.BR.flatrate
      } catch (e) {
        responseData = []
      }
    })

  return responseData
}

async function getMovies(keywordIds) {
  const keywordsIdsFormatted = keywordIds.join(',')
  const url = `https://api.themoviedb.org/3/discover/movie?include_adult=false&include_video=false&language=pt-BR&page=1&with_keywords=${keywordsIdsFormatted}`

  let responseData = null

  await fetch(url, requestGetOptions)
    .then(res => res.json())
    .then(async (json) => {
      responseData = shuffle(json.results).slice(0, 10)

      responseDataWithProviders = [...responseData]

      await responseDataWithProviders.forEach(async (movie) => {
        movie['providers'] = await getMovieProviders(movie.id)
      })

    })

  return responseDataWithProviders
}

io.on('connection', (socket) => {
  console.log('Novo cliente conectado');

  // Recebimento da mensagem do cliente
  ss(socket).on('message', (stream) => {
    let message = '';

    stream.on('data', (chunk) => {
      message += chunk;
    });

    stream.on('end', async () => {
      console.log('Recebido: ' + message);
      let keywords = message.replace('/keywords/', '').split('&')

      let keywordIds = []

      keywordIds = await getKeywordIds(keywords)

      setTimeout(async () => {
        let response = { data: null }

        if (keywordIds.length > 0) {
          await getMovies(keywordIds).then((results) => {
            setTimeout(() => response.data = results, 800)
          })
        }

        setTimeout(() => {
          // Resposta para o cliente
          const responseStream = ss.createStream();
          ss(socket).emit('response', responseStream);

          responseStream.end(JSON.stringify(response));
        }, 1000)
      }, 2000)
    });
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
});

server.listen(15000, () => {
  console.log('Servidor rodando na porta 15000');
});