/*
 * The AnVIL
 * https://www.anvilproject.org
 *
 * Basic service supporting gatsby-node schema customization.
 */

const { buildMenuItems } = require("./create-pages.service");
const moment = require("moment-timezone");

/**
 * Returns the bubble date, as an array i.e. [month, date, year]
 * for easy rendering of the date in bubble format.
 *
 * @param source
 * @returns {[string,string,string]}
 */
const buildDateBubbleField = function buildDateBubbleField(source) {
  const { sessions, timezone } = source || {};

  if (!sessions) {
    return [];
  }

  /* Grab a set of sessions. */
  const setOfSessions = getSetOfSessions(sessions, timezone);

  /* Grab the first session. */
  const firstSession = getFirstSession(setOfSessions);

  /* Format the first session and return as a string array [MMM, DD, YYYY]. */
  return firstSession.format("MMM DD YYYY").split(" ");
};

/**
 * Returns the start date, taken from the earliest "session" date.
 *
 *
 * @param source
 * @returns {*}
 */
const buildDateStartField = function buildDateStartField(source) {
  const { sessions, timezone } = source || {};

  if (!sessions) {
    return "";
  }

  /* Grab a set of sessions. */
  const setOfSessions = getSetOfSessions(sessions, timezone);

  /* Grab the first session. */
  const firstSession = getFirstSession(setOfSessions);

  /* Return formatted first session. */
  return firstSession.toDate();
};

/**
 * Returns an array of menu item values, comprising of display name, and path and any corresponding sub menu items (tabs).
 *
 * @param source
 * @param nodes
 * @returns {Array}
 */
const buildMenuItemsField = function buildMenuItemsField(source, nodes) {
  /* Build the menus with corresponding tabs from the site map nodes. */
  const menus = buildMenuItems(nodes);

  /* Build the menu items.*/
  const menuItems = [];

  for (const menuKey of source.menuItems) {
    /* Find the menu item for the specified menu key. */
    const menu = menus.find((menuItem) => menuItem.key === menuKey);
    /* Add menu item to menu items. */
    if (menu) {
      const { key, path, tabs } = menu;
      /* Map tabs to sub menu items. */
      const subMenuItems = tabs.map((tab) => {
        return { name: tab.name, path: tab.path };
      });
      menuItems.push({
        name: key,
        path: path,
        subMenuItems: subMenuItems,
      });
    } else {
      console.log(`*** *** Error. Header ${menuKey} not found.`);
    }
  }

  return menuItems;
};

/**
 * Returns true if a page was created for the specified markdown.
 * Typically used by carousel, news and events static queries to only include pages created during the build.
 *
 * @param source
 * @param pages
 * @returns {boolean}
 */
const buildPageCreatedField = function buildPageCreatedField(source, pages) {
  if (pages) {
    const slug = source?.fields?.slug;

    return pages.some((page) => {
      const pageSlug = page?.context?.slug;
      return slug === pageSlug;
    });
  }

  return false;
};

/**
 * Returns the session in a displayable format.
 *
 * @param source
 * @returns {Array}
 */
const buildSessionsDisplayField = function buildSessionsDisplayField(source) {
  const { sessions, timezone } = source || {};

  if (!sessions) {
    return [];
  }

  /* Return reformatted sessions into a string array. */
  return reformatToDisplayableSessions(sessions, timezone);
};

/**
 * Converts a date value to a moment object.
 *
 * @param date
 * @param timezone
 * @returns {*}
 */
function convertSessionDateToMoment(date, timezone = "") {
  if (!date) {
    return "";
  }

  return moment.tz(date, ["D MMM YYYY h:mm A", "D MMM YYYY"], timezone);
}

/**
 * Returns a set of sessions, each session as a moment object.
 *
 * @param sessions
 * @param timezone
 * @returns {*}
 */
function getSetOfSessions(sessions, timezone) {
  /* Grab a complete set of sessions. */
  const setOfSessions = new Set();

  sessions.forEach((session) => {
    const { sessionEnd, sessionStart } = session || {};

    if (sessionEnd) {
      setOfSessions.add(
        convertSessionDateToMoment(session.sessionEnd, timezone)
      );
    }

    if (sessionStart) {
      setOfSessions.add(
        convertSessionDateToMoment(session.sessionStart, timezone)
      );
    }
  });

  return setOfSessions;
}

/**
 * Returns the earliest session as a moment object.
 *
 * @param setOfSessions
 * @returns {*}
 */
function getFirstSession(setOfSessions) {
  /* Sort the sessions ASC. */
  const sortedSessions = [...setOfSessions].sort((moment01, moment02) =>
    moment01.diff(moment02)
  );

  /* Return the first session. */
  return sortedSessions.shift();
}

/**
 * Returns the sessions in a FE displayable format.
 *
 * @param sessions
 * @param timezone
 * @returns {Array}
 */
function reformatToDisplayableSessions(sessions, timezone) {
  return sessions.map((session) => {
    const { sessionEnd, sessionStart } = session || {};

    /* Grab the various formatting styles for display of each session. */
    const formatByTimeWithPeriod = "h:mm A";
    const formatByTimeWithTZ = `${formatByTimeWithPeriod} zz`;
    const formatByDate = "dddd MMMM D YYYY";
    const formatByTime24Hr = "HH:mm"; // Used to check if time is specified for event

    /* Start and end sessions. */
    /* Both start and end sessions are expected to have time values. */
    /* i.e. A start session without a time, having an end session (also without a time, but perhaps on the next day)
     * is indicative of improper use of the frontmatter field "sessions". */
    /* Returns the session display string e.g. "Friday July 17 2020 09:16 AM to 11:45 AM EST". */
    if (sessionStart && sessionEnd) {
      /* Format the session start and end display strings. */
      const startDisplayStr = convertSessionDateToMoment(
        sessionStart,
        timezone
      ).format(`${formatByDate} ${formatByTimeWithPeriod}`);
      const endDisplayStr = convertSessionDateToMoment(
        sessionEnd,
        timezone
      ).format(formatByTimeWithTZ);

      return `${startDisplayStr} to ${endDisplayStr}`;
    }

    /* Start session only. */
    /* Returns either "Friday Jul 17 2020 09:16 AM EST" if a time is specified
     * or "Friday Jul 17 2020" if no time has been specified with the start session. */
    if (sessionStart) {
      /* Grab the session start moment. */
      const startMoment = convertSessionDateToMoment(sessionStart, timezone);

      /* Returns the start session without time, if no time has been specified. */
      /* e.g. "Friday Jul 17 2020". */
      if (startMoment.format(formatByTime24Hr) === "00:00") {
        return startMoment.format(formatByDate);
      }

      /* Returns the start session with time. */
      /* e.g. "Friday Jul 17 2020 09:16 AM". */
      return convertSessionDateToMoment(sessionStart, timezone).format(
        `${formatByDate} ${formatByTimeWithTZ}`
      );
    }

    return "";
  });
}

module.exports.buildDateBubbleField = buildDateBubbleField;
module.exports.buildDateStartField = buildDateStartField;
module.exports.buildMenuItemsField = buildMenuItemsField;
module.exports.buildPageCreatedField = buildPageCreatedField;
module.exports.buildSessionsDisplayField = buildSessionsDisplayField;
