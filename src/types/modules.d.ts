declare module 'next-auth' {
  export * from 'next-auth/next';
  export { default } from 'next-auth/next';
  export type { NextAuthOptions } from 'next-auth/core/types';
}
