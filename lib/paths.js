const path = require('path').posix
const SandboxPath = require('sandbox-path')
const sandbox = new SandboxPath('/')

function resolveLink (key, linkname, target, realpath) {
  // console.log('RESOLVING LINK, key:', key, 'linkname:', linkname, 'target:', target)
  target = path.normalize(target)

  const keyComponents = key.split('/').length
  const linkComponents = linkname.split('/').length
  const subKey = (keyComponents === linkComponents) ? '' : key.slice(linkname.length)

  const linkdir = path.dirname(linkname)
  const source = target === '.' ? linkname : linkdir

  var resolved = sandbox.resolve(source, target)
  if (resolved !== '/' && realpath) {
    const r = realpath(sandbox.dirname(resolved))
    if (r === null) return null
    resolved = sandbox.resolve(r, sandbox.basename(resolved))
  }
  resolveLink.directories = normalize(resolved) === '/' ? 0 : normalize(resolved).split('/').length - 1
  var normalized = path.normalize(resolved + '/' + subKey)
  // console.log('  linkdir:', linkdir, 'resolved:', resolved, 'normalized:', normalized)

  // Make sure there aren't leading or trailing slashes.
  if (normalized.endsWith('/')) normalized = normalized.slice(0, normalized.length - 1)
  if (normalized.startsWith('/')) normalized = normalized.slice(1)

  return normalized
}

resolveLink.directories = 0

function shouldFollowLink (link, target) {
  const targetComponents = target.toString().split('/')
  const linkComponents = link.toString().split('/')
 // console.log('IN SHOULD FOLLOW, TARGET:', targetComponents, 'LINK:', linkComponents)

  for (let i = 0; i < linkComponents.length; i++) {
    if (linkComponents[i] !== targetComponents[i]) return false
  }
  return true
}

function linkContains (link, target) {
  const resolved = resolveLink(link, link, target)
  return shouldFollowLink(link, resolved)
}

function redirectTo (target, node, rename) {
  const t = normalize(target.key.toString())
  const n = normalize(node.key.toString())
  const r = normalize(rename)

  if (t === n) return r
  if (t.startsWith(n + '/')) return t.replace(n, rename)
  return t
}

function normalize (path) {
  if (!path.startsWith('/')) return '/' + path
  return path
}

module.exports = {
  resolveLink,
  shouldFollowLink,
  linkContains,
  redirectTo
}
