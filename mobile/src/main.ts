import '@fontsource-variable/ibm-plex-sans';
import { mount } from 'svelte';
import App from './App.svelte';
import './mobile.css';

const target = document.getElementById('app');
if (!target) throw new Error('Mobile app root is missing.');

mount(App, { target });
