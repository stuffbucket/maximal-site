const SHARD_HOST = /https?:\/\/ms-feed-\d+\.pkgs\.visualstudio\.com(?=[:/]|$)/;

function afterAllResolved(lockfile) {
  const packages = lockfile?.packages;
  if (packages === null || typeof packages !== "object") {
    console.warn(
      "pnpmfile: lockfile has no `packages` map; shard hosts were not filtered.",
    );
    return lockfile;
  }

  let dropped = 0;
  for (const entry of Object.values(packages)) {
    const tarball = entry?.resolution?.tarball;
    if (typeof tarball !== "string" || !SHARD_HOST.test(tarball)) continue;
    delete entry.resolution.tarball;
    dropped += 1;
  }

  if (dropped > 0) {
    console.log(
      `pnpmfile: dropped ${dropped} rotating shard-host tarball URL(s)`,
    );
  }
  return lockfile;
}

module.exports = { hooks: { afterAllResolved } };