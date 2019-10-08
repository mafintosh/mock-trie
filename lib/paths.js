const path = require('path').posix
const SandboxPath = require('sandbox-path')
const sandbox = new SandboxPath('/')

function resolveLink (key, linkname, target) {
  // console.log('RESOLVING LINK, key:', key, 'linkname:', linkname, 'target:', target)
  target = path.normalize(target)

  const keyComponents = key.split('/').length
  const linkComponents = linkname.split('/').length
  const subKey = (keyComponents === linkComponents) ? '' : key.slice(linkname.length)

  const linkdir = path.dirname(linkname)
  const source = target === '.' ? linkname : linkdir


  const resolved = sandbox.resolve(source, target)
  var normalized = path.normalize(resolved + '/' + subKey)
  // console.log('  linkdir:', linkdir, 'resolved:', resolved, 'normalized:', normalized)

  // Make sure there aren't leading or trailing slashes.
  if (normalized.endsWith('/')) normalized = normalized.slice(0, normalized.length - 1)
  if (normalized.startsWith('/')) normalized = normalized.slice(1)

  return normalized
}

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
  console.log('IN LINK CONTAINS, link:', link, 'target:', target)
  const resolved = resolveLink(link, link, target)
  return shouldFollowLink(link, resolved)
}

function redirectTo (target, node, rename) {
  const t = target.key.toString()
  const n = node.key.toString()

  return t.replace(n, rename)
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
