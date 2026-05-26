#!/bin/bash
FILE="sections/custom-product-display.liquid"

# Let's replace the top CSS override with a more robust one
sed -i 's|/\* BREAK OUT OF THE THEME.S SECTION GRID \*/|/* BREAK OUT OF THE THEME S SECTION GRID */|g' $FILE

# We will just replace the whole top part of the style block.
