// The two user roles. The users table enforces the same list with a CHECK constraint (002).
//   admin  : reads every node and may change node configuration
//   viewer : reads only the nodes assigned to it in user_nodes, and may not change configuration
export const ADMIN = "admin";
export const VIEWER = "viewer";
export const ROLES = Object.freeze([ADMIN, VIEWER]);
