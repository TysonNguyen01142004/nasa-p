const axios = require("axios");
const launchesDatabase = require("./launches.mongo");
const DEFAULT_FLIGHT_NUMBER = 100;
const planets = require("./planets.mongo");

const launch = {
  flightNumber: 100, // flight_number
  mission: "Kepler Exploration X", // name
  rocket: "Explorer IS1", //rocket.name
  launchDate: new Date("December 27, 2026"), // date_local
  target: "Kepler-442 b", // not applicable
  customers: ["Top G", "Ve Trang"], //  payload.customers
  upcoming: true, // upcoming
  success: true, // success
};

saveLaunch(launch);
const SPACEX_API_URL = "https://api.spacexdata.com/v4/launches/query";
async function loadLaunchesData() {
  console.log("Dowloading launches data...");
  const response = await axios.post(SPACEX_API_URL, {
    query: {},
    options: {
      populate: [
        {
          path: "rocket",
          select: {
            name: 1,
          },
        },
        {
          path: "payloads",
          select: {
            customers: 1,
          },
        },
      ],
    },
  });
  const launchDocs = response.data.docs;
  for (const launchDoc of launchDocs) {
    const launch = {
      flightNumber: launchDoc["flight_number"], // flight_number
      mission: launchDoc["name"], // name
      rocket: launchDoc["rocket"]["name"], //rocket.name
      launchDate: launchDoc["date_local"], // date_local
      target: launchDoc[""], // not applicable
      customers: ["Top G", "Ve Trang"], //  payload.customers
      upcoming: launchDoc["upcoming"], // upcoming
      success: launchDoc["success"], // success
    };
  }
}

async function existsLaunchWithId(launchId) {
  return await launchesDatabase.findOne({
    flightNumber: launchId,
  });
}

async function getLastestFlightNumber() {
  const lastestLaunch = await launchesDatabase.findOne().sort("-flightNumber");
  if (!lastestLaunch) {
    return DEFAULT_FLIGHT_NUMBER;
  }
  return lastestLaunch.flightNumber;
}

async function getAllLaunches() {
  return await launchesDatabase.find(
    {},
    {
      _id: 0,
      __v: 0,
    }
  );
}

async function saveLaunch(launch) {
  const planet = await planets.findOne({
    keplerName: launch.target,
  });

  if (!planet) {
    throw new Error("no matching planet found");
  }

  await launchesDatabase.findOneAndUpdate(
    {
      flightNumber: launch.flightNumber,
    },
    launch,
    {
      upsert: true,
    }
  );
}

async function scheduleNewLaunch(launch) {
  const newFlightNumber = (await getLastestFlightNumber()) + 1;
  const newLaunch = Object.assign(launch, {
    customers: ["Top G", "Ve Trang"],
    upcoming: true,
    success: true,
    flightNumber: newFlightNumber,
  });
  await saveLaunch(newLaunch);
}

async function abortLaunchById(launchId) {
  const aborted = await launchesDatabase.updateOne(
    {
      flightNumber: launchId,
    },
    {
      upcoming: false,
      success: false,
    }
  );
  return aborted.modifiedCount === 1;
}

module.exports = {
  getAllLaunches,
  scheduleNewLaunch,
  existsLaunchWithId,
  abortLaunchById,
  loadLaunchesData,
};
