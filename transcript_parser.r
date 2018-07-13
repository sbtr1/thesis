# Takes the earnings transcripts for an individual company and computes a sentiment score
# Merges sentiment score with financial results, then exports output to csv format, e.g. AAPL_sentiment.csv
#
# Shawn Ban
# 1 July, 2018

library(tidyverse)
library(tidytext)
library(zoo)
library(scales)

#Get list of stop words to remove:
data(stop_words)

apos_words <- c("they\u2019re","would\u2019ve","there\u2019s", "we\u2019re", 
                "you\u2019re", "don\u2019t","it\u2019s", "that\u2019s", 
                "we\u2019ve", "we\u2019ll", "i\u2019d", "can\u2019t", "i\u2019ll",
                "you\u2019ve", "haven\u2019t", "i\u2019m", "o\u2019reilly",
                "o\u2019callaghan", "o\u2019connor", "tom\u00E9", "he\u2019s",
                "o\u2019neil", "cr\u00E9dit", "o\u2019conner", "gary\u2019s",
                "barclay\u2019s", "08", "09", "02", "wyeth\u2019s", "d\u2019amelio",
                "what\u2019s", "anybody\u2019s", "ma\u2019am", "amil\u2019s",
                "you\u2019ll", "she\u2019s", "she\u2019ll", "wouldn\u2019t", "alliance")

#Get list of proper nouns to remove:
stop_names <- read.csv("stopnames.csv")
stop_names$word <- as.character(stop_names$word)

#Initialize empty data frame:
all_sentiment_financials <- data.frame(quarter=character(), negative=numeric(), 
                                       positive=numeric(), uncertainty=numeric(), 
                                       sentiment_score=numeric(), revenue=numeric(), 
                                       operatingIncome=numeric(), netIncome=numeric(),
                                       mktcap=numeric(), stock=character(), stringsAsFactors=FALSE)

#Iterate through each stock:
tickers <- read.csv("tickers.csv",  stringsAsFactors=FALSE)

for (i in c(1:30)){
  alltidy_df <- data.frame(quarter=character(), word=character(), stringsAsFactors=FALSE)
  stock <- tickers[i,1]
  print(stock)
  
  #Change working directory based on company:
  stock_length <- nchar(stock)
  stock_financials <- read.csv(paste("Financials/", stock, "_financials" ,".csv", sep=""))
  
  #Get list of files:
  files <- list.files(path=paste("Transcripts/", stock, sep=""), pattern="*.txt", full.names=T, recursive=FALSE)
  
  #Iterate through files:
  for (filename in files){
    #Import data:
    mystring <- read_file(filename)
    
    #Transform into tidy format:
    text_df <- data_frame(text = mystring)
    qtr <- str_sub(filename, stock_length*2+3, -5)
    text_df$quarter <- qtr
    
    #Unnest tokens:
    tidy_df <- text_df %>%
      unnest_tokens(word, text)
    
    #Remove stopwords and proper nouns:
    tidy_df <- tidy_df %>%
      anti_join(stop_words) %>%
      anti_join(stop_names)
    
    #Append to data frame:
    alltidy_df <- rbind(alltidy_df, tidy_df)
  }
  
  alltidy_df <- alltidy_df %>%
    filter(!word %in% apos_words)
  
  #Basic term frequency:
  alltidy_df %>%
    count(word, sort = TRUE)
  
  alltidy_df <- alltidy_df %>%
    add_count(quarter) %>%
    rename(qtr_total = n)
  
  #Sentiment:
  earnings_sentiment <- alltidy_df %>%
    inner_join(get_sentiments("loughran"))
  
  earnings_sentiment %>%
    count(sentiment)
  
  #Plotting sentiment score:
  tidy_sentiment <- earnings_sentiment %>%
    count(quarter, sentiment) %>%
    filter(sentiment %in% c("positive", "negative", "uncertainty")) %>%
    spread(sentiment, n)
  
  tidy_sentiment$sentiment_score <- tidy_sentiment$positive / 
    (tidy_sentiment$negative + tidy_sentiment$positive + tidy_sentiment$uncertainty)
  
  tidy_sentiment <- merge(tidy_sentiment, stock_financials, by = "quarter", all=TRUE)
  tidy_sentiment$stock <- stock

  #TF-IDF:
  quarter_words <- alltidy_df %>%
    count(quarter, word, sort = TRUE) %>%
    ungroup()
  
  total_words <- quarter_words %>% 
    group_by(quarter) %>% 
    summarize(total = sum(n))
  
  quarter_words <- left_join(quarter_words, total_words)
  
  quarter_words <- quarter_words %>%
    bind_tf_idf(word, quarter, n)

  top3words <- quarter_words %>%
    arrange(desc(tf_idf)) %>%
    mutate(word = factor(word, levels = rev(unique(word)))) %>% 
    group_by(quarter) %>% 
    top_n(3) %>%
    summarise(word1 = word[1], word2 = word[2], word3 = word[3])
  
  top3words$word1 <- as.character(top3words$word1)
  top3words$word2 <- as.character(top3words$word2)
  top3words$word3 <- as.character(top3words$word3)
  
  tidy_sentiment <- merge(tidy_sentiment, top3words, by="quarter", all=TRUE)
  
  all_sentiment_financials <- rbind(all_sentiment_financials, tidy_sentiment)
}

#Rename:
all_companies <- all_sentiment_financials

#Linear interpolation of null values:
all_companies$sentiment_score <- na.approx(all_companies$sentiment_score)

#Get summary statistics and sector lookup:
lookup <- read.csv("lookup.csv")
all_companies <- merge(all_companies, lookup, by="stock")

#Write as CSV file:
write.csv(all_companies, file = "master_summary.csv", row.names=FALSE)


##Some exploratory plots, not necessary to run:
#Words driving sentiment scores:
earnings_sentiment %>%
  count(sentiment, word) %>%
  filter(sentiment %in% c("positive", "negative", 
                          "uncertainty")) %>%
  group_by(sentiment) %>%
  top_n(10) %>%
  ungroup %>%
  mutate(word = reorder(word, n)) %>%
  mutate(sentiment = factor(sentiment, levels = c("negative",
                                                  "positive",
                                                  "uncertainty"))) %>%
  ggplot(aes(word, n, fill = sentiment)) +
  geom_col(alpha = 0.8, show.legend = FALSE) +
  coord_flip() +
  scale_y_continuous(expand = c(0,0)) +
  facet_wrap(~sentiment, scales = "free") +
  labs(x = NULL, y = "Total number of occurrences",
       title = paste("Words driving sentiment scores in", stock, "earnings calls"),
       subtitle = "From the Loughran-McDonald lexicon")

#Relative frequency of sentiment by quarter:
earnings_sentiment %>%
  count(quarter, qtr_total, sentiment) %>%
  filter(sentiment %in% c("positive", "negative", "uncertainty")) %>%
  mutate(sentiment = factor(sentiment, levels = c("negative",
                                                  "positive",
                                                  "uncertainty"))) %>%
  ggplot(aes(quarter, n/qtr_total, group = sentiment)) +
  geom_line(aes(color=sentiment))+
  geom_point(aes(color=sentiment)) +
  labs(y = "Relative frequency", x = NULL,
       title = paste("Sentiment analysis of", stock, "earnings calls"),
       subtitle = "Using the Loughran-McDonald lexicon") +
  theme(axis.text.x = element_text(angle = 60, hjust = 1))

#Plotting sentiment score:
tidy_sentiment <- earnings_sentiment %>%
  count(quarter, sentiment) %>%
  filter(sentiment %in% c("positive", "negative", "uncertainty")) %>%
  spread(sentiment, n)

tidy_sentiment %>%
  ggplot(aes(quarter, sentiment_score, group=1)) +
  geom_line(colour="#000099") + 
  geom_point(colour="#000099") +
  labs(y = "Sentiment score", x = NULL,
       title = paste("Sentiment score of", stock, "earnings calls (higher = more positive)"),
       subtitle = "Using the Loughran-McDonald lexicon") +
  theme(axis.text.x = element_text(angle = 60, hjust = 1))

#For a given company, shows TF-IDF top 3:
quarter_words %>%
  arrange(desc(tf_idf)) %>%
  mutate(word = factor(word, levels = rev(unique(word)))) %>% 
  group_by(quarter) %>% 
  top_n(3) %>% 
  ungroup %>%
  ggplot(aes(word, tf_idf, fill = quarter)) +
  geom_col(show.legend = FALSE) +
  labs(x = NULL, y = "tf-idf") +
  facet_wrap(~quarter, ncol = 8, scales = "free") +
  coord_flip() +
  ggtitle("Highest TF-IDF words by quarter")

all_companies <- read.csv("master_summary2.csv")

#Summary statistics by stock:
all_grouped <- all_companies %>%
  group_by(stock) %>%
  summarise(
    sentiment = mean(sentiment_score, na.rm=TRUE),
    corr_revenue = cor(sentiment_score, revenue),
    corr_op_income = cor(sentiment_score, operatingIncome),
    corr_net_income = cor(sentiment_score, netIncome),
    corr_revenuegrowth = cor(sentiment_score, revenueGrowth)
  )

#Analysis by sector:
all_grouped <- merge(all_grouped, lookup, by="stock")
all_grouped_sector <- all_grouped %>%
  group_by(sector) %>%
  summarise(
    sentiment = mean(sentiment, na.rm=TRUE),
    corr_revenue = mean(corr_revenue),
    corr_operating = mean(corr_op_income),
    corr_net = mean(corr_net_income)
  )

#Some charts:
theme_set(theme_classic())

all_grouped %>%
  ggplot(aes(x=reorder(stock, sentiment), sentiment)) +
  geom_point(col="steelblue3", size=4) +   # Draw points
  geom_segment(aes(x=stock, 
                   xend=stock, 
                   y=0.3, 
                   yend=0.8), 
               linetype="dashed", 
               size=0.1) +   # Draw dashed lines
  labs(x=NULL, y = "Sentiment score",
       title="Average sentiment score by company (higher = more positive)", 
       subtitle="Using the Loughran-McDonald lexicon") +  
  coord_flip()

all_grouped_sector %>%
  ggplot(aes(x=reorder(sector, sentiment), sentiment)) +
  geom_point(col="steelblue3", size=4) +   # Draw points
  geom_segment(aes(x=sector, 
                   xend=sector, 
                   y=0.4, 
                   yend=0.7), 
               linetype="dashed", 
               size=0.1) +   # Draw dashed lines
  labs(x=NULL, y = "Sentiment score",
       title="Average sentiment score by sector (higher = more positive)", 
       subtitle="Using the Loughran-McDonald lexicon") +  
  coord_flip()

#Some more charts:
theme_set(theme_bw())
all_grouped$corr_rev_above <- ifelse(all_grouped$corr_revenue < 0, "below", "above")
all_grouped$corr_op_above <- ifelse(all_grouped$corr_op_income < 0, "below", "above")
all_grouped$corr_net_above <- ifelse(all_grouped$corr_net_income < 0, "below", "above")

all_grouped_sector$corr_rev_above <- ifelse(all_grouped_sector$corr_revenue < 0, "below", "above")
all_grouped_sector$corr_op_above <- ifelse(all_grouped_sector$corr_operating < 0, "below", "above")
all_grouped_sector$corr_net_above <- ifelse(all_grouped_sector$corr_net < 0, "below", "above")

all_grouped %>%
  ggplot(aes(x=reorder(stock, corr_revenue), corr_revenue)) +
  geom_point(stat='identity', aes(col=corr_rev_above), size=4)  +
  scale_color_manual(name="Correlation", 
                     labels = c("Positive correlation", "Negative correlation"), 
                     values = c("above"="#00ba38", "below"="#f8766d")) + 
  labs(y = "Correlation", x = NULL,
       title = "Average correlation of sentiment and revenue by company") +
  ylim(-0.5, 1) +
  coord_flip()

all_grouped %>%
  ggplot(aes(x=reorder(stock, corr_op_income), corr_op_income)) +
  geom_point(stat='identity', aes(col=corr_op_above), size=4)  +
  scale_color_manual(name="Correlation", 
                     labels = c("Positive correlation", "Negative correlation"), 
                     values = c("above"="#00ba38", "below"="#f8766d")) + 
  labs(y = "Correlation", x = NULL,
       title = "Average correlation of sentiment and operating income by company") +
  ylim(-0.5, 0.75) +
  coord_flip()

all_grouped %>%
  ggplot(aes(x=reorder(stock, corr_net_income), corr_net_income)) +
  geom_point(stat='identity', aes(col=corr_net_above), size=4)  +
  scale_color_manual(name="Correlation", 
                     labels = c("Positive correlation", "Negative correlation"), 
                     values = c("above"="#00ba38", "below"="#f8766d")) + 
  labs(y = "Correlation", x = NULL,
       title = "Average correlation of sentiment and net income by company") +
  ylim(-0.5, 0.75) +
  coord_flip()

#Some more charts on correlation:
all_grouped_sector %>%
  ggplot(aes(x=reorder(sector, corr_revenue), corr_revenue)) +
  geom_point(stat='identity', aes(col=corr_rev_above), size=4)  +
  scale_color_manual(name="Correlation", 
                     labels = c("Positive correlation", "Negative correlation"), 
                     values = c("above"="#00ba38", "below"="#f8766d")) + 
  labs(y = "Correlation", x = NULL,
       title = "Average correlation of sentiment and revenue by sector") +
  ylim(-0.5, 0.5) +
  coord_flip()

all_grouped_sector %>%
  ggplot(aes(x=reorder(sector, corr_operating), corr_operating)) +
  geom_point(stat='identity', aes(col=corr_op_above), size=4)  +
  scale_color_manual(name="Correlation", 
                     labels = c("Positive correlation", "Negative correlation"), 
                     values = c("above"="#00ba38", "below"="#f8766d")) + 
  labs(y = "Correlation", x = NULL,
       title = "Average correlation of sentiment and operating income by sector") +
  ylim(-0.5, 0.5) +
  coord_flip()

all_grouped_sector %>%
  ggplot(aes(x=reorder(sector, corr_net), corr_net)) +
  geom_point(stat='identity', aes(col=corr_net_above), size=4)  +
  scale_color_manual(name="Correlation", 
                     labels = c("Positive correlation", "Negative correlation"), 
                     values = c("above"="#00ba38", "below"="#f8766d")) + 
  labs(y = "Correlation", x = NULL,
       title = "Average correlation of sentiment and net income by sector") +
  ylim(-0.5, 0.5) +
  coord_flip()

write.csv(all_grouped, file = "all_grouped.csv", row.names = FALSE)
write.csv(all_grouped_sector, file = "all_grouped_sector.csv", row.names = FALSE)