#!/bin/sh
npm install
cd ../frontend
npm install
npm run build
cd ../app
npx nodemon server.js
