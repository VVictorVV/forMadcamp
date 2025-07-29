-- This policy allows authenticated users who are part of a project
-- to update the project details.
CREATE POLICY "Enable update for project members"
ON public."PROJECTS"
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) IN (
    SELECT profile_id
    FROM "public"."PARTICIPATOR"
    WHERE project_id = "PROJECTS".project_id
  )
)
WITH CHECK (
  (SELECT auth.uid()) IN (
    SELECT profile_id
    FROM "public"."PARTICIPATOR"
    WHERE project_id = "PROJECTS".project_id
  )
); 