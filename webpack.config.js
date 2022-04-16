const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: {
        index: './src/index.js',
    },
    module: {
        // rules: [{
        //     test: /llvm-dis.wasm/,
        //     type: 'asset/inline'
        // }]
    },
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },
    devtool: 'inline-source-map',
    externals: {
        'wasmer_wasi_js_bg.wasm': true
    },
    resolve: {
        fallback: {
            buffer: require.resolve('buffer/'),
        },
    },
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
        new HtmlWebpackPlugin({
            inject: 'body',
            template: './src/index.html',
            scriptLoading: 'blocking'
        }),
    ]
};
