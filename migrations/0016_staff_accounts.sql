-- Migration 0016: cleaning staff sign in.
--
-- Until now staff picked their name on a dropdown. From here on every staff
-- member has an account: the username is their first name at upi.edu
-- (gilang@upi.edu; a second "Muhammad" becomes muhammad2@upi.edu) and the
-- starting password is 123456, which the supervisor can change per person.
--
-- One shared salt for the starting password is deliberate: everyone knows it
-- anyway. Changing the password (updateAccount) gives that account its own salt.
-- PBKDF2-SHA256, 100 000 iterations, as in src/adapters/password.ts.
--
-- The same statement closes seed/cleaning-areas.sql, for staff seeded after this.

WITH base AS (
  SELECT id,
         lower(replace(replace(replace(
           CASE WHEN instr(trim(name), ' ') > 0
                THEN substr(trim(name), 1, instr(trim(name), ' ') - 1)
                ELSE trim(name) END,
           '.', ''), ',', ''), '''', '')) AS first
    FROM users
   WHERE role = 'staff' AND username IS NULL
),
ranked AS (
  SELECT id, first, ROW_NUMBER() OVER (PARTITION BY first ORDER BY id) AS n FROM base
)
UPDATE users
   SET username = (
         SELECT first || CASE WHEN n > 1 THEN n ELSE '' END || '@upi.edu'
           FROM ranked WHERE ranked.id = users.id
       ),
       password_salt = '73757171d0329380533ea06ec94a23b6',
       password_hash = 'aad8c05927e15908569b26ca5456dae06b230bdf1c67b0593fc5c583d0eb2c3e'
 WHERE role = 'staff' AND username IS NULL;
