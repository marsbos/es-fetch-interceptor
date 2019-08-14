import { terser } from 'rollup-plugin-terser';
export default [
  {
    input: './src/index.js',
    output: {
        file: __dirname + '/dist/index.min.js',
        format: 'esm',
    },
    plugins: [
      terser(),
    ]
  },
]