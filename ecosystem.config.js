module.exports = {
    apps: [{
        name: 'boilerplate',
        script: './dist/index.js',
        instances: 1,
        exec_mode: 'cluster',
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'production'
        }
    }]
};
