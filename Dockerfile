FROM node:8.9.4

# Create app directory
WORKDIR /usr/src/borderless-exact
# Copy both package.json and package-lock.json
COPY package*.json ./
RUN npm install --only=production # Yay docker caching http://bitjudo.com/blog/2014/03/13/building-efficient-dockerfiles-node-dot-js/

# Bundle app source
COPY . .

EXPOSE 3000 # TODO: refactor exposed port
ENV NODE_ENV="production"

USER node
CMD ["node" "dist/main/index.js"]
