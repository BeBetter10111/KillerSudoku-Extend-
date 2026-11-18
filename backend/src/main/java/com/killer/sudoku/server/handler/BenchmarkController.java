package com.killer.sudoku.server.handler;

import com.killer.sudoku.server.protocol.BenchmarkRequest;
import com.killer.sudoku.service.BenchmarkBusyException;
import com.killer.sudoku.service.BenchmarkResult;
import com.killer.sudoku.service.BenchmarkService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/benchmark")
public class BenchmarkController {

    private final BenchmarkService benchmarkService;

    public BenchmarkController(BenchmarkService benchmarkService) {
        this.benchmarkService = benchmarkService;
    }

    @PostMapping("/run")
    public BenchmarkResult run(@RequestBody BenchmarkRequest request) {
        if (request == null || request.difficulty() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "difficulty is required");
        }
        int batchSize = request.batchSize() == null ? BenchmarkService.DEFAULT_BATCH_SIZE : request.batchSize();
        try {
            return benchmarkService.run(request.difficulty(), batchSize, request.seedPrefix());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (BenchmarkBusyException e) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
        }
    }
}
