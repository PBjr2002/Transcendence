#!/bin/sh
npm install
cd ../frontend
npm run build
cp index.html public/
cd ../app
npm start