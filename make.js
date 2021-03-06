const arg = require('arg');
const webpack = require('webpack');
const fs = require('fs-extra');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const ts = require('typescript');

// arg handling
const args = arg({
    '--entry': String,
    '--out-dir': String,
    '--production': Boolean,
    '--watch': Boolean,

    '-e': '--entry',
    '-o': '--out-dir',
    '-p': '--production',
    '-w': '--watch',
});
const entryFile = path.resolve(__dirname, args['--entry'] || 'src/index.ts');
const outDir = path.resolve(__dirname, args['--out-dir'] || 'public');
const prod = !!args['--production'];
const watch = !!args['--watch'];


// build helpers
const log = (...strs) => console.log.apply(console.log,['[make]'].concat(strs));


// build website
(async () => {
    log(
        'Started with options:',
        '\n  Entry File: ' + entryFile,
        '\n  Out Dir: ' + outDir,
        '\n  Prod: ' + prod.toString(),
        '\n  Watch: ' + watch.toString());

    log('Create public folder if missing and make sure it is empty');
    fs.emptyDirSync(outDir);


    log('Build app');
    await new Promise((res, rej) => {
        const compiler = webpack({
            mode: prod ? 'production' : 'development',
            devtool: prod ? undefined : 'source-map',
            entry: entryFile,
            target: 'web',
            watch,
            output: {
                filename: 'bundle.js',
                path: outDir,
                publicPath: '',
            },
            resolve: {
                extensions: ['.js', '.ts', '.tsx'],
                modules: ['node_modules'],
            },
            externals: {
                './bundle.js': 'bundle.js',
            },
            module: {
                rules: [
                    {// html files
                        test: /\.html?$/i,
                        use: [
                            "file-loader?name=[name].html",
                            "extract-loader",
                            "html-loader",
                        ]
                    },
                    {// index file
                        test: /index\.pug$/i,
                        include: path.resolve(__dirname, 'src/index.pug'),
                        use: [
                            "file-loader?name=[name].html",
                            "extract-loader",
                            "html-loader",
                            "extract-loader",
                            "raw-loader",
                            "pug-html-loader",
                        ],
                    },
                    {// pug templates
                        test: /((?!index).+)\.(pug|jade)$/i,
                        exclude: path.resolve(__dirname, 'src', 'index.pug'),
                        use: [
                            "pug-loader"
                        ],
                    },
                    {// typescript
                        test: /\.tsx?$/i,
                        loader: 'ts-loader',
                        options: {
                            allowTsInNodeModules: true,
                        },
                    },
                    {// main scss
                        test: /\.s[ac]ss$/i,
                        //include: path.resolve(__dirname, 'src', 'main.scss'),
                        use: [
                            "file-loader?name=[contenthash].css",
                            "extract-loader",
                            {
                                loader: 'css-loader',
                                options: {
                                    sourceMap: !prod,
                                }
                            },
                            {
                                loader: 'sass-loader',
                                options: {
                                    sourceMap: !prod,
                                }
                            }
                        ],
                    },
                    {// assets
                        test: /\.(png)/i,
                        use: [
                            "file-loader?name=[contenthash].[ext]",
                        ],
                    },

                    /*
                    {// component scss
                        test: /\.s[ac]ss$/i,
                        exclude: path.resolve(__dirname, 'src', 'main.scss'),
                        use: [
                            'to-string-loader',
                            {
                                loader: 'css-loader',
                                options: {
                                    esModule: false,
                                    sourceMap: !prod,
                                }
                            },
                            {
                                loader: 'sass-loader',
                                options: {
                                    sourceMap: !prod,
                                }
                            }
                        ],
                    },*/
                    {// markdown
                        test: /\.md$/i,
                        use: [
                            { loader: 'html-loader' },
                            { loader: 'markdown-loader' },
                        ],
                    },
                ],
            },
            plugins: [/*
                new CopyPlugin({
                    patterns: [
                        { from: 'assets', to: './assets' },
                    ]
                }),*/
                new ProgressBarPlugin(),
                new webpack.IgnorePlugin(
                    /bundle\.js$/i
                ),
            ],
        });

        const handler = (err, stats) => { // Stats Object
            if (err || stats.hasErrors()) {
                rej({err, further: stats.compilation.errors});
                return;
            }

            process.stdout.write(stats.toString() + '\n');
            res();
        };

        if (watch) {
            log('Start watcher...');
            compiler.watch({}, handler);
        }
        else {
            log('Start compilation...');
            compiler.run(handler);
        }
    });
})().catch(console.error).finally(() => log('FINISHED'));
