FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV STUDENT_NAME="Задайте STUDENT_NAME"
ENV STUDENT_GROUP="Задайте STUDENT_GROUP"
ENV APP_TYPE="default"
ENV NAMESPACE="default"

EXPOSE 3000

CMD ["npm", "start"]
