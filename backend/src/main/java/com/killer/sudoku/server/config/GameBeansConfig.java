package com.killer.sudoku.server.config;

import com.killer.sudoku.algorithm.BacktrackingCageGenerator;
import com.killer.sudoku.algorithm.PuzzleGenerator;
import com.killer.sudoku.algorithm.WeightedRandomBotStrategy;
import com.killer.sudoku.config.DifficultyConfig;
import com.killer.sudoku.core.GameSessionFactory;
import com.killer.sudoku.service.BenchmarkService;
import com.killer.sudoku.service.EdgeCaseTestRunner;
import java.time.Clock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GameBeansConfig {

    @Bean
    public BacktrackingCageGenerator cageGenerator() {
        return new BacktrackingCageGenerator();
    }

    @Bean
    public PuzzleGenerator puzzleGenerator(BacktrackingCageGenerator cageGenerator) {
        return new PuzzleGenerator(cageGenerator);
    }

    @Bean
    public WeightedRandomBotStrategy botStrategy() {
        return new WeightedRandomBotStrategy();
    }

    @Bean
    public DifficultyConfig difficultyConfig(
            WeightedRandomBotStrategy botStrategy,
            BacktrackingCageGenerator cageGenerator,
            @Value("${game.reshape-interval-ms:0}") long reshapeIntervalMs) {
        return new DifficultyConfig(botStrategy, cageGenerator, reshapeIntervalMs);
    }

    @Bean
    public GameSessionFactory gameSessionFactory(PuzzleGenerator puzzleGenerator, DifficultyConfig difficultyConfig) {
        return new GameSessionFactory(puzzleGenerator, difficultyConfig);
    }

    @Bean
    public BenchmarkService benchmarkService(
            PuzzleGenerator puzzleGenerator, BacktrackingCageGenerator cageGenerator, Clock clock) {
        return new BenchmarkService(puzzleGenerator, cageGenerator, clock);
    }

    @Bean
    public EdgeCaseTestRunner edgeCaseTestRunner(
            PuzzleGenerator puzzleGenerator,
            BacktrackingCageGenerator cageGenerator,
            GameSessionFactory sessionFactory,
            Clock clock) {
        return new EdgeCaseTestRunner(puzzleGenerator, cageGenerator, sessionFactory, clock);
    }

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
