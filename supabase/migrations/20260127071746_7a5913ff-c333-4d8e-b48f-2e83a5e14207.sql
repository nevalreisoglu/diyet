-- Drop the existing check constraint
ALTER TABLE public.meals DROP CONSTRAINT IF EXISTS meals_meal_type_check;

-- Add new check constraint with updated meal types
ALTER TABLE public.meals ADD CONSTRAINT meals_meal_type_check 
CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'snack1', 'snack2', 'snack3'));

-- Also update meal_schedules if it has a similar constraint
ALTER TABLE public.meal_schedules DROP CONSTRAINT IF EXISTS meal_schedules_meal_type_check;

ALTER TABLE public.meal_schedules ADD CONSTRAINT meal_schedules_meal_type_check 
CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'snack1', 'snack2', 'snack3'));