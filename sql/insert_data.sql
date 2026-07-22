-- -----------------------------------------------------
-- Relationship Type
-- -----------------------------------------------------

INSERT INTO `relationship_type` (`relationship_type_id`, `name`) VALUES
(1, 'spouse'),
(2, 'child'),
(3, 'grandparent');
-- -----------------------------------------------------
-- Users
-- -----------------------------------------------------
-- ADMIN (account owner, no family)
INSERT INTO `c237_026_team3_ca2`.`user` (`user_id`, `card_id`, `name`, `phone_number`, `password`, `role`, `points`, `primary_user_id`) VALUES
(1, 'ADMIN', 'Leon', '83366519', 'd29dfb12b4e550a23eb9938698b10ab27f6dfe5d', 'admin', NULL, NULL); -- logs in with name 'Leon', password L123456

-- REGULAR USERS (both account owners)
INSERT INTO `c237_026_team3_ca2`.`user` (`user_id`, `card_id`, `name`, `phone_number`, `password`, `role`, `points`, `primary_user_id`, `relationship_type_id`) VALUES
(2, 'J091200', 'John Tan', '91234567', 'e9c1240161604e16a32ded612ba0c91b9b751fe0', 'customer', 0, NULL, NULL), -- johnpassword
(3, 'M098700', 'Mary Lim', '98765432', '95f2790dac9edcf83af260413fd927392eef4c18', 'customer', 0, NULL, NULL); -- marypassword

-- FAMILY MEMBER (Lily, under John's account)
INSERT INTO `c237_026_team3_ca2`.`user` (`user_id`, `card_id`, `name`, `phone_number`, `password`, `role`, `points`, `primary_user_id`, `relationship_type_id`) VALUES
(4, 'J091201', 'Lily Tan', '12345678', 'd98cb42bb148541314ea1911af3c28a1fa4a6233', 'customer', 0, 2, 1); -- lilypassword


-- -----------------------------------------------------
-- Categories
-- -----------------------------------------------------
INSERT INTO `c237_026_team3_ca2`.`category` (`category_id`, `name`) VALUES
(1, 'Asian'),
(2, 'Tandoori'),
(3, 'Pasta'),
(4, 'Pizza');

-- -----------------------------------------------------
-- Menu Items: Asian
-- -----------------------------------------------------
INSERT INTO `c237_026_team3_ca2`.`menu_item`
(`menu_item_id`, `category_id`, `name`, `image`, `description`, `price`, `available`) VALUES
(1, 1, 'Seafood Hokkien Mee', 'seafood_hokkien_mee.jpg', 'Stir-fried noodles with prawns, squid and egg in a rich savoury broth.', 15.00, 1),
(2, 1, 'Beef Char Kway Teow', 'beef_char_kway_teow.jpg', 'Flat rice noodles wok-fried with beef slices, bean sprouts and dark soy sauce.', 15.00, 1),
(3, 1, 'Laksa', 'laksa.jpg', 'Spicy coconut curry noodle soup with prawns, fish cake and tofu puffs.', 14.00, 1),
(4, 1, 'Lamb Shank', 'lamb_shank.jpg', 'Slow-braised lamb shank served with fragrant rice and gravy.', 18.00, 1),
(5, 1, 'Nasi Goreng', 'nasi_goreng.jpg', 'Indonesian-style fried rice with egg, chicken and prawn crackers.', 14.00, 1);

-- -----------------------------------------------------
-- Menu Items: Tandoori
-- -----------------------------------------------------
INSERT INTO `c237_026_team3_ca2`.`menu_item`
(`menu_item_id`, `category_id`, `name`, `image`, `description`, `price`, `available`) VALUES
(6, 2, 'Murg Makhani (Butter Chicken)', 'butter_chicken.jpg', 'Tandoori chicken simmered in a creamy, buttery tomato sauce.', 12.00, 1),
(7, 2, 'Garlic Nan', 'garlic_nan.jpg', 'Traditional tandoor-baked flatbread topped with garlic and butter.', 10.00, 1),
(8, 2, 'Palak Paneer', 'palak_paneer.jpg', 'Cottage cheese cubes simmered in a smooth spiced spinach gravy.', 11.00, 1),
(9, 2, 'Murg Tikka Masala', 'murg_tikka_masala.jpg', 'Grilled chicken tikka in a spiced tomato and cream masala sauce.', 12.00, 1),
(10, 2, 'Tandori Half Chicken', 'tandori_half_chicken.jpg', 'Half chicken marinated in yoghurt and spices, roasted in the tandoor.', 14.00, 1);

-- -----------------------------------------------------
-- Menu Items: Pasta
-- (Pasta type x Sauce, all priced at $14)
-- -----------------------------------------------------
INSERT INTO `c237_026_team3_ca2`.`menu_item`
(`menu_item_id`, `category_id`, `name`, `image`, `description`, `price`, `available`) VALUES
(11, 3, 'Spaghetti Bolognese', 'spaghetti_bolognese.jpg', 'Spaghetti tossed in a rich minced beef and tomato ragu.', 14.00, 1),
(12, 3, 'Spaghetti Carbonara', 'spaghetti_carbonara.jpg', 'Spaghetti in a creamy egg, cheese and pancetta sauce.', 14.00, 1),
(13, 3, 'Fusilli Bolognese', 'fusilli_bolognese.jpg', 'Fusilli tossed in a rich minced beef and tomato ragu.', 14.00, 1),
(14, 3, 'Fusilli Carbonara', 'fusilli_carbonara.jpg', 'Fusilli in a creamy egg, cheese and pancetta sauce.', 14.00, 1),
(15, 3, 'Penne Bolognese', 'penne_bolognese.jpg', 'Penne tossed in a rich minced beef and tomato ragu.', 14.00, 1),
(16, 3, 'Penne Carbonara', 'penne_carbonara.jpg', 'Penne in a creamy egg, cheese and pancetta sauce.', 14.00, 1),
(17, 3, 'Linguine Bolognese', 'linguine_bolognese.jpg', 'Linguine tossed in a rich minced beef and tomato ragu.', 14.00, 1),
(18, 3, 'Linguine Carbonara', 'linguine_carbonara.jpg', 'Linguine in a creamy egg, cheese and pancetta sauce.', 14.00, 1);

-- -----------------------------------------------------
-- Menu Items: Pizza
-- -----------------------------------------------------
INSERT INTO `c237_026_team3_ca2`.`menu_item`
(`menu_item_id`, `category_id`, `name`, `image`, `description`, `price`, `available`) VALUES
(19, 4, 'Hawaiian Pizza', 'hawaiian_pizza.jpg', 'Classic pizza topped with ham and pineapple.', 14.00, 1),
(20, 4, 'Diavola Pizza', 'diavola_pizza.jpg', 'Spicy pizza topped with salami and chilli.', 14.00, 1),
(21, 4, 'Margherita Pizza', 'margherita_pizza.jpg', 'Simple classic with tomato, mozzarella and fresh basil.', 13.00, 1),
(22, 4, 'Salsiccia Pizza', 'salsiccia_pizza.jpg', 'Pizza topped with Italian sausage and mozzarella.', 19.00, 1),
(23, 4, 'Prosciutto Pizza', 'prosciutto_pizza.jpg', 'Pizza topped with prosciutto, rocket and shaved parmesan.', 20.00, 1);

-- -----------------------------------------------------
-- Sizes (used for Pizza)
-- -----------------------------------------------------
INSERT INTO `c237_026_team3_ca2`.`size` (`size_id`, `name`) VALUES
(1, 'Small (12 inches)'),
(2, 'Regular (16 inches)');

-- -----------------------------------------------------
-- menu_item_has_size: Pizza sizing
-- -----------------------------------------------------
INSERT INTO `c237_026_team3_ca2`.`menu_item_has_size` (`menu_item_id`, `size_id`, `price`) VALUES
(19, 1, 14.00), (19, 2, 17.00),  -- Hawaiian
(20, 1, 14.00), (20, 2, 17.00),  -- Diavola
(21, 1, 13.00), (21, 2, 16.00),  -- Margherita
(22, 1, 19.00), (22, 2, 22.00),  -- Salsiccia
(23, 1, 20.00), (23, 2, 23.00);  -- Prosciutto

-- -----------------------------------------------------
-- Add-ons (Pizza)
-- All $2 except meat (Pork/Chicken Sausages) at $4
-- -----------------------------------------------------
INSERT INTO `c237_026_team3_ca2`.`add_on` (`add_on_id`, `name`, `price`) VALUES
(1, 'Anchovies', 2.00),
(2, 'Pork/Chicken Sausages', 4.00),
(3, 'Olives', 2.00),
(4, 'Spinach', 2.00),
(5, 'Pineapple', 2.00);

-- -----------------------------------------------------
-- menu_item_has_add_on: link all add-ons to all pizzas
-- -----------------------------------------------------
INSERT INTO `c237_026_team3_ca2`.`menu_item_has_add_on` (`menu_item_id`, `add_on_id`) VALUES
(19, 1), (19, 2), (19, 3), (19, 4), (19, 5),  -- Hawaiian
(20, 1), (20, 2), (20, 3), (20, 4), (20, 5),  -- Diavola
(21, 1), (21, 2), (21, 3), (21, 4), (21, 5),  -- Margherita
(22, 1), (22, 2), (22, 3), (22, 4), (22, 5),  -- Salsiccia
(23, 1), (23, 2), (23, 3), (23, 4), (23, 5);  -- Prosciutto


-- SAMPLE ORDERS

-- -----------------------------------------------------
-- Order 1: John Tan
-- 2x Laksa ($14) = 28
-- 1x Hawaiian Pizza, Regular ($17) = 17
-- 3x Garlic Nan ($10) = 30
-- + add-ons on the pizza: Anchovies (2) + Olives (2) = 4
-- Total = 79
-- -----------------------------------------------------
INSERT INTO `c237_026_team3_ca2`.`order` (`order_id`, `user_id`, `total`, `points_earned`, `points_redeemed`, `discount_amount`) VALUES
(1, 2, 79.00, 79, NULL, NULL);

INSERT INTO `c237_026_team3_ca2`.`order_item` (`order_item_id`, `order_id`, `menu_item_id`, `size_id`, `quantity`) VALUES
(1, 1, 3, NULL, 2),   -- Laksa x2
(2, 1, 19, 2, 1),     -- Hawaiian Pizza, Regular x1
(3, 1, 7, NULL, 3);   -- Garlic Nan x3

INSERT INTO `c237_026_team3_ca2`.`order_item_has_add_on` (`order_item_id`, `add_on_id`) VALUES
(2, 1),  -- Anchovies on the Hawaiian Pizza
(2, 3);  -- Olives on the Hawaiian Pizza

-- -----------------------------------------------------
-- Order 2: Mary Lim
-- 1x Spaghetti Bolognese ($14) = 14
-- 1x Salsiccia Pizza, Small ($19) = 19
-- + add-on on the pizza: Pork/Chicken Sausages (4)
-- Total = 37
-- -----------------------------------------------------
INSERT INTO `c237_026_team3_ca2`.`order` (`order_id`, `user_id`, `total`, `points_earned`, `points_redeemed`, `discount_amount`) VALUES
(2, 3, 37.00, 37, NULL, NULL);

INSERT INTO `c237_026_team3_ca2`.`order_item` (`order_item_id`, `order_id`, `menu_item_id`, `size_id`, `quantity`) VALUES
(4, 2, 11, NULL, 1),  -- Spaghetti Bolognese x1
(5, 2, 22, 1, 1);     -- Salsiccia Pizza, Small x1

INSERT INTO `c237_026_team3_ca2`.`order_item_has_add_on` (`order_item_id`, `add_on_id`) VALUES
(5, 2);  -- Extra sausage on the Salsiccia Pizza

-- -----------------------------------------------------
-- Order 3: John Tan — redeeming points from Order 1
-- 1x Murg Tikka Masala ($12) = 12
-- Redeems 10 points as a $5 discount
-- Total = 12 - 5 = 7
-- -----------------------------------------------------
INSERT INTO `c237_026_team3_ca2`.`order` (`order_id`, `user_id`, `total`, `points_earned`, `points_redeemed`, `discount_amount`) VALUES
(3, 2, 7.00, 7, 10, 5.00);

INSERT INTO `c237_026_team3_ca2`.`order_item` (`order_item_id`, `order_id`, `menu_item_id`, `size_id`, `quantity`) VALUES
(6, 3, 9, NULL, 1);  -- Murg Tikka Masala x1

