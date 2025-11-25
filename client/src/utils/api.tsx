import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

const instance = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json'
    },
    timeout:1000
})

export const api = {
    
}