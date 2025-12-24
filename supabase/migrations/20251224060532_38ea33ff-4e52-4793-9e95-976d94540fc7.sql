-- Add UPDATE policy for food_items table
CREATE POLICY "Users can update their own food items" 
ON public.food_items 
FOR UPDATE 
USING (EXISTS ( SELECT 1
   FROM meals
  WHERE ((meals.id = food_items.meal_id) AND (meals.user_id = auth.uid()))))
WITH CHECK (EXISTS ( SELECT 1
   FROM meals
  WHERE ((meals.id = food_items.meal_id) AND (meals.user_id = auth.uid()))));