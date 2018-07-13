# Converts DF to JSON format
#
# Shawn Ban
# 1 July, 2018

library(tidyverse)
library(jsonlite)


master_summary <- read.csv("master_summary.csv")
master_summary$negative <- NULL
master_summary$positive <- NULL
master_summary$uncertainty <- NULL
master_summary$revenue <- master_summary$revenue/1000
master_summary$operatingIncome <- master_summary$operatingIncome/1000
master_summary$netIncome <- master_summary$netIncome/1000
master_summary$mktcap <- master_summary$mktcap/1000
master_summary$word1 <- as.character(master_summary$word1)
master_summary$word2 <- as.character(master_summary$word2)
master_summary$word3 <- as.character(master_summary$word3)

group_by_quarter <- master_summary %>%
  group_by(quarter) %>%
  nest()

outputJSON <- toJSON(group_by_quarter, pretty = TRUE)
write(outputJSON, "group_by_quarter.json")

group_by_stock <- master_summary %>%
  group_by(stock) %>%
  nest()

outputJSON2 <- toJSON(group_by_stock, pretty = TRUE)
write(outputJSON2, "group_by_stock.json")

group_by_stock2 <- split(master_summary, master_summary$stock)
outputJSON3 <- toJSON(group_by_stock2, pretty = TRUE)
write(outputJSON3, "group_by_stock2.json")
