#!/bin/sh
npm install
cd ../frontend
npm run build
cd ../app
npm start