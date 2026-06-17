/// <reference types="vite/client" />

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}
