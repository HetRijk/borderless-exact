FROM node:8.9.4

# Create app directory
WORKDIR /usr/src/borderless-exact
# Copy both package.json and package-lock.json
COPY package*.json ./
RUN npm install --only=production # Yay docker caching http://bitjudo.com/blog/2014/03/13/building-efficient-dockerfiles-node-dot-js/

# Bundle app source
COPY . .

# TODO: refactor exposed port
EXPOSE 3000
ENV NODE_ENV="production"

USER node
CMD ["node" "dist/megatest.js"]
