
const maxmind = require("maxmind");
const path = require("path");
const net = require("net");

const databasePath =
  process.env.GEOLITE2_COUNTRY_DB ||
  path.join(__dirname, "../data/GeoLite2-Country.mmdb");

let readerPromise = null;

async function getGeoReader() {
  if (!readerPromise) {
    readerPromise = maxmind.open(databasePath).catch((error) => {
      console.error("GeoLite2 database could not be opened:", error.message);

      // Allow another attempt after the database is installed or corrected.
      readerPromise = null;

      throw error;
    });
  }

  return readerPromise;
}

function normalizeIp(ipAddress) {
  if (!ipAddress) return null;

  let ip = String(ipAddress).trim();

  // Convert IPv4-mapped IPv6 addresses into ordinary IPv4.
  if (ip.startsWith("::ffff:")) {
    ip = ip.substring(7);
  }

  if (!net.isIP(ip)) {
    return null;
  }

  return ip;
}

async function lookupCountry(ipAddress) {
  const ip = normalizeIp(ipAddress);

  if (!ip) return null;

  try {
    const reader = await getGeoReader();
    const result = reader.get(ip);

    return result?.country?.iso_code ||
      result?.registered_country?.iso_code ||
      null;
  } catch (error) {
    // Private, local, invalid, and unlisted IP addresses may not resolve.
    return null;
  }
}

module.exports = {
  lookupCountry,
};
