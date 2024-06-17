<script setup lang="ts">
import { io } from "socket.io-client";
import * as ss from 'socket.io-stream';
import translate from "translate";
import { ref } from 'vue';

const onLoad = ref<boolean>(false)
const noResults = ref<boolean>(false)
const keywords = ref<string>('')
const movies = ref<any[]>([])

const socket = io('http://localhost:15000');

ss(socket).on('response', (stream: any) => {
  let response: any = '';

  stream.on('data', (chunk: any) => {
    response += chunk;
  });
  
  stream.on('end', () => {
    let movieResults = JSON.parse(response)
    console.log('Resposta do servidor: ', movieResults.data)
    movies.value = movieResults.data

    noResults.value = movies.value.length === 0
    setTimeout(() => onLoad.value = false, 1000)
  });
});

socket.on('connect', () => {
  console.log('Conectado ao servidor');
});

socket.on('disconnect', () => {
  noResults.value = true
  onLoad.value = false 
  
  console.log('Desconectado do servidor');
});

translate.engine = "google"

async function translateKeywords(keywords: string[]) {
  const englishKeywords: string[] = []

  keywords.forEach(async (keyword: string) => {
    await translate(keyword, {from: "pt", to: 'en'})
    .then((translatedKeyword) => {
      englishKeywords.push(translatedKeyword)
      console.log(translatedKeyword)
    })
  })

  console.log('englishKeywords', englishKeywords)

  return englishKeywords
}

async function sendKeywords() {
  let untranslatedKeywords = keywords.value.split(',').map((keyword: string) => keyword.trim())

  await translateKeywords(untranslatedKeywords).then((englishKeywords) => {
    setTimeout(() => {
      const message = '/keywords/'+ englishKeywords.join('&');
      const stream = ss.createStream();
    
      ss(socket).emit('message', stream);
      stream.end(message);

      onLoad.value = true
    }, 500)
  })
}

function getYear(date: string) {
  return  date.split('-')[0]
}

</script>

<template>
    <div class="search-container">
      <img src="./assets/pipoca.png" class="search-img">
      <h3 class="search-logo">Descubra Filmes</h3>
      
      <input type="text" v-model="keywords" placeholder="Digite palavras-chave">

      <button @click="() => sendKeywords() ">Pesquisar</button>

      <div v-show="onLoad" class="loading">
        <img src="./assets/loading.gif" style="width: 96px;">
      </div>

      <div v-show="!onLoad && noResults" class="no-results">
        <div>Sem resultados</div>
        <p>Tente outras palavras-chave</p>
      </div>

      <div v-show="!onLoad && movies.length > 0" class="gallery">
        <div v-for="movie in movies" :key="movie.id" class="movie">
          <div class="movie-display">
            <img :src="`https://image.tmdb.org/t/p/original/${movie.poster_path}`" class="movie-poster" />
            
            <div class="providers">
              <img v-for="provider in movie.providers" :key="provider.provider_id" :src="`https://image.tmdb.org/t/p/original/${provider.logo_path}`" style="width: 48px; height: 48px; border-radius: 4px;" class="provider"/>
            </div>
          </div>
          
          <h3>{{ movie.title }}</h3>


          <div class="movie-info">
            <span class="movie-year">{{ getYear(movie.release_date) }}</span>
          </div>
        </div>
      </div>
    </div>
</template>

<style scoped>

input {
  width: 30%;
  padding: 12px;
  border-radius: 8px;
  border: 0px solid white;
  background-color: rgba(255, 255, 255, 0.1);
  color: white;
  font-family: 'Poppins', sans-serif;
}

input:focus {
  outline: 1px solid white;
  box-shadow: 0 4px 8px 0 rgba(255, 255, 255, 0.1), 0 6px 20px 0 rgba(255, 255, 255, 0.09);
}

button {
  color: white;
  font-weight: 700;
  border: 0px;
  border-radius: 8px;
  background-color: #7C162E;
  padding: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  font-weight: 500;
  font-family: 'Poppins', sans-serif;
}

button:hover {
  background-color: #5a0c1e;
}

button:active {
  background-color: #3f0714;
}

.search-container {
  display: flex;
  width: 100%;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding-top: 32px;
}

.search-logo {
  margin: 0;
  margin-bottom: 16px;
  font-family: 'Major Mono Display', monospace;
  font-size: 24px;
}

/* Estilos CSS para a galeria de filmes */
.gallery {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
  padding: 24px;
  font-family: 'Poppins', sans-serif;
}

.movie {
  width: 200px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s ease;
  margin: 2px;
}

.movie:hover {
  transform: translateY(-5px);
  margin: 0px;
  border: 2px solid rgb(240, 196, 206);
  box-shadow: 0 4px 8px 0 rgba(124, 22, 46, 0.3), 0 6px 20px 0 rgba(124, 22, 46, 0.29);
}

.movie-display {
  position: relative;
}

.movie-poster {
  width: 100%;
  height: 300px;
  border-radius: 10px 10px 0 0;
}

.movie h3 {
  margin: 10px;
  margin-bottom: 2px;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
}

.movie-info {
  padding: 10px;
  text-align: center;
}

.movie-year {
  font-size: 12px;
  color: #777;
}

.loading {
  border-radius: 12px;
  opacity: 0.3;
}

.no-results {
  display: flex;
  align-items: center;
  margin-top: 24px;
  flex-direction: column;
  border-radius: 8px;

  p {
    font-size: x-small;
  }
}

.movie .providers {
  display: none;
}

.movie:hover .providers {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  align-content: center;
  gap: 24px;
  flex-wrap: wrap;
  width: 100%;
  height: 292px;
  padding: 4px;
  position: absolute;
  top: 0px;
  left: 0px;
  background-color: rgba(14, 12, 22, 0.85);
}

.provider {
  box-shadow: 0 4px 8px 0 rgba(211, 201, 203, 0.2), 0 6px 20px 0 rgba(192, 142, 154, 0.2);
}

</style>
