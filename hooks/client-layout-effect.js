import {useEffect, useLayoutEffect} from 'react';

// useLayoutEffect in the browser, useEffect on the server, where useLayoutEffect only warns.
export const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
