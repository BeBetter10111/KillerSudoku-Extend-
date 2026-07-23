package com.killer.sudoku.algorithm;

import java.util.ArrayList;
import java.util.List;

public class DancingLinksSolver {

    private static final int BOARD_SIZE = 9;
    private static final int SUBGRID_SIZE = 3;
    private static final int EXACT_COVER_COLS = 324; // 4 ràng buộc * 81

    // Định nghĩa cấu trúc Node 4 hướng của Dancing Links
    private static class Node {
        Node left, right, up, down;
        ColumnNode column;
        int rowIndex; // Lưu chỉ số hàng để khôi phục đáp án

        Node() {
            left = right = up = down = this;
        }

        Node(ColumnNode c, int rowIndex) {
            this();
            this.column = c;
            this.rowIndex = rowIndex;
        }
    }

    // Node đặc biệt đại diện cho Tiêu đề cột (Column Header)
    private static class ColumnNode extends Node {
        int size = 0; // Số lượng số 1 trong cột này
        String id;

        ColumnNode(String id) {
            super();
            this.id = id;
            this.column = this;
        }
    }

    private ColumnNode root;
    private List<Node> solution;
    private int[][] solvedMatrix;
    private int solutionCount;

    public DancingLinksSolver() {
        this.root = new ColumnNode("ROOT");
        this.solution = new ArrayList<>();
    }

    /**
     * Hàm cốt lõi: Giải bàn cờ Sudoku đầu vào
     * @param grid Ma trận 9x9 (0 là ô trống)
     * @return Ma trận đã giải, hoặc null nếu vô nghiệm
     */
    public int[][] solve(int[][] grid) {
        this.root = createDLXStructure(grid);
        this.solution.clear();
        this.solvedMatrix = null;
        this.solutionCount = 0;

        search(0, true); // true để dừng ngay khi tìm thấy nghiệm đầu tiên
        return solvedMatrix;
    }

    /**
     * Kiểm tra tính duy nhất của nghiệm (Phục vụ tính năng Cage Reshape)
     * @return true nếu ma trận có DUY NHẤT một nghiệm giải được
     */
    public boolean hasUniqueSolution(int[][] grid) {
        this.root = createDLXStructure(grid);
        this.solution.clear();
        this.solutionCount = 0;

        search(0, false); // false để tìm tất cả các nghiệm có thể có
        return this.solutionCount == 1;
    }

    // Thuật toán tìm kiếm đệ quy Algorithm X của Knuth
    private void search(int k, boolean stopAtFirst) {
        if (stopAtFirst && solvedMatrix != null) return;

        // Nếu cột Root trỏ vào chính nó -> Đã phủ hết các ràng buộc -> Tìm thấy nghiệm
        if (root.right == root) {
            solutionCount++;
            if (solvedMatrix == null) {
                solvedMatrix = parseSolutionToMatrix();
            }
            return;
        }

        // Chiến lược Heuristic: Chọn cột có ít node nhất để giảm nhánh cây quyết định (MRV - Minimum Remaining Values)
        ColumnNode c = selectColumnWithMinNodes();
        cover(c);

        for (Node r = c.down; r != c; r = r.down) {
            solution.add(r);

            for (Node j = r.right; j != r; j = j.right) {
                cover(j.column);
            }

            search(k + 1, stopAtFirst);

            // Quay lui (Backtrack) - Khôi phục trạng thái con trỏ ("Dancing")
            r = solution.remove(solution.size() - 1);
            c = r.column;

            for (Node j = r.left; j != r; j = j.left) {
                uncover(j.column);
            }
        }

        uncover(c);
    }

    // Cơ chế Cover: Tách cột và tất cả các hàng xung đột ra khỏi đồ thị liên kết
    private void cover(ColumnNode c) {
        c.right.left = c.left;
        c.left.right = c.right;

        for (Node i = c.down; i != c; i = i.down) {
            for (Node j = i.right; j != i; j = j.right) {
                j.down.up = j.up;
                j.up.down = j.down;
                j.column.size--;
            }
        }
    }

    // Cơ chế Uncover: Nối lại các con trỏ đúng vị trí cũ mà không làm xáo trộn cấu trúc
    private void uncover(ColumnNode c) {
        for (Node i = c.up; i != c; i = i.up) {
            for (Node j = i.left; j != i; j = j.left) {
                j.column.size++;
                j.down.up = j;
                j.up.down = j;
            }
        }
        c.right.left = c;
        c.left.right = c;
    }

    private ColumnNode selectColumnWithMinNodes() {
        ColumnNode minCol = null;
        int minSize = Integer.MAX_VALUE;
        for (Node n = root.right; n != root; n = n.right) {
            ColumnNode c = (ColumnNode) n;
            if (c.size < minSize) {
                minSize = c.size;
                minCol = c;
            }
        }
        return minCol;
    }

    // Khởi tạo ma trận liên kết vòng 4 hướng từ lưới Sudoku hiện tại
    private ColumnNode createDLXStructure(int[][] grid) {
        ColumnNode headerRoot = new ColumnNode("ROOT");
        List<ColumnNode> columnList = new ArrayList<>();

        // 1. Tạo 324 cột tiêu đề
        ColumnNode lastNode = headerRoot;
        for (int i = 0; i < EXACT_COVER_COLS; i++) {
            ColumnNode col = new ColumnNode("C" + i);
            columnList.add(col);
            lastNode.right = col;
            col.left = lastNode;
            lastNode = col;
        }
        lastNode.right = headerRoot;
        headerRoot.left = lastNode;

        // 2. Điền các hàng (729 ứng viên khả dĩ) vào đồ thị liên kết
        for (int r = 0; r < BOARD_SIZE; r++) {
            for (int c = 0; c < BOARD_SIZE; c++) {
                int fixedValue = grid[r][c];
                if (fixedValue != 0) {
                    // Nếu ô đã điền số sẵn, chỉ sinh 1 hàng duy nhất cho số đó
                    addRowToDLX(r, c, fixedValue, columnList);
                } else {
                    // Nếu ô trống, sinh đủ 9 hàng ứng viên từ 1 đến 9
                    for (int v = 1; v <= BOARD_SIZE; v++) {
                        addRowToDLX(r, c, v, columnList);
                    }
                }
            }
        }
        return headerRoot;
    }

    private void addRowToDLX(int r, int c, int v, List<ColumnNode> columnList) {
        int rowIndex = (r * 81) + (c * 9) + (v - 1);
        int b = (r / SUBGRID_SIZE) * SUBGRID_SIZE + (c / SUBGRID_SIZE);

        // Xác định vị trí số 1 trong 4 danh mục ràng buộc
        int idx1 = (r * 9) + c;                         // Ràng buộc ô trống
        int idx2 = 81 + (r * 9) + (v - 1);               // Ràng buộc hàng
        int idx3 = 162 + (c * 9) + (v - 1);              // Ràng buộc cột
        int idx4 = 243 + (b * 9) + (v - 1);              // Ràng buộc khối 3x3

        int[] rowConstraints = {idx1, idx2, idx3, idx4};
        Node firstInRow = null;

        for (int colIdx : rowConstraints) {
            ColumnNode colNode = columnList.get(colIdx);
            Node newNode = new Node(colNode, rowIndex);

            // Nối vào danh sách cột (theo chiều dọc)
            newNode.up = colNode.up;
            newNode.down = colNode;
            colNode.up.down = newNode;
            colNode.up = newNode;
            colNode.size++;

            // Nối vào danh sách hàng (theo chiều ngang)
            if (firstInRow == null) {
                firstInRow = newNode;
            } else {
                newNode.left = firstInRow.left;
                newNode.right = firstInRow;
                firstInRow.left.right = newNode;
                firstInRow.left = newNode;
            }
        }
    }

    private int[][] parseSolutionToMatrix() {
        int[][] matrix = new int[BOARD_SIZE][BOARD_SIZE];
        for (Node node : solution) {
            int r = (node.rowIndex / 81);
            int c = (node.rowIndex % 81) / 9;
            int v = (node.rowIndex % 9) + 1;
            matrix[r][c] = v;
        }
        return matrix;
    }
}