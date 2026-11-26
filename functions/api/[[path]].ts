import { proxyToBackend, type ProxyContext } from '../_lib/proxy'

export const onRequest = (context: ProxyContext) => proxyToBackend(context)
