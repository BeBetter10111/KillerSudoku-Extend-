package com.killer.sudoku;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class KillerSudokuApplication {

    public static void main(String[] args) {
        SpringApplication.run(KillerSudokuApplication.class, args);
    }
}
